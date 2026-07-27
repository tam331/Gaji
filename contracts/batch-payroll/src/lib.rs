#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, BytesN, Env,
};

const INSTANCE_BUMP_LEDGERS: u32 = 30 * 17_280;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_LEDGERS - 17_280;
const BATCH_BUMP_LEDGERS: u32 = 90 * 17_280;
const BATCH_LIFETIME_THRESHOLD: u32 = BATCH_BUMP_LEDGERS - 17_280;

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum BatchStatus {
    Draft,
    Funded,
    Closed,
    Refunded,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Batch {
    pub employer: Address,
    pub asset: Address,
    pub total_amount: i128,
    pub claimed_amount: i128,
    pub worker_count: u32,
    pub claimed_count: u32,
    pub status: BatchStatus,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct WorkerPayment {
    pub amount: i128,
    pub claimed: bool,
}

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Asset,
    Batch(BytesN<32>),
    Worker(BytesN<32>, Address),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracterror]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    BatchExists = 3,
    BatchNotFound = 4,
    WorkerExists = 5,
    WorkerNotFound = 6,
    InvalidAmount = 7,
    InvalidStatus = 8,
    AlreadyClaimed = 9,
    NotFullyClaimed = 10,
    NothingToRefund = 11,
    ArithmeticOverflow = 12,
}

#[contract]
pub struct BatchPayrollContract;

#[contractevent(data_format = "single-value")]
pub struct BatchPayrollInitialized {
    pub admin: Address,
}

#[contractevent(data_format = "single-value")]
pub struct BatchCreated {
    pub batch_id: BytesN<32>,
}

#[contractevent(data_format = "map")]
pub struct WorkerAdded {
    pub batch_id: BytesN<32>,
    pub worker: Address,
    pub amount: i128,
}

#[contractevent(data_format = "single-value")]
pub struct BatchFunded {
    pub batch_id: BytesN<32>,
}

#[contractevent(data_format = "map")]
pub struct PayrollClaimed {
    pub batch_id: BytesN<32>,
    pub worker: Address,
    pub amount: i128,
}

#[contractevent(data_format = "single-value")]
pub struct BatchClosed {
    pub batch_id: BytesN<32>,
}

#[contractevent(data_format = "map")]
pub struct BatchRefunded {
    pub batch_id: BytesN<32>,
    pub employer: Address,
    pub amount: i128,
}

#[contractimpl]
impl BatchPayrollContract {
    pub fn initialize(e: Env, admin: Address, asset: Address) -> Result<(), Error> {
        if e.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Asset, &asset);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_LEDGERS);
        BatchPayrollInitialized { admin }.publish(&e);
        Ok(())
    }

    pub fn admin(e: Env) -> Result<Address, Error> {
        Self::read_admin(&e)
    }

    pub fn asset(e: Env) -> Result<Address, Error> {
        Self::read_asset(&e)
    }

    pub fn create_batch(e: Env, batch_id: BytesN<32>, employer: Address) -> Result<(), Error> {
        Self::read_admin(&e)?;
        employer.require_auth();
        let key = DataKey::Batch(batch_id.clone());
        if e.storage().persistent().has(&key) {
            return Err(Error::BatchExists);
        }
        let batch = Batch {
            employer,
            asset: Self::read_asset(&e)?,
            total_amount: 0,
            claimed_amount: 0,
            worker_count: 0,
            claimed_count: 0,
            status: BatchStatus::Draft,
        };
        Self::write_batch(&e, &key, &batch);
        BatchCreated { batch_id }.publish(&e);
        Ok(())
    }

    pub fn add_worker(
        e: Env,
        batch_id: BytesN<32>,
        worker: Address,
        amount: i128,
    ) -> Result<(), Error> {
        let batch_key = DataKey::Batch(batch_id.clone());
        let mut batch = Self::read_batch(&e, &batch_key)?;
        batch.employer.require_auth();
        if batch.status != BatchStatus::Draft {
            return Err(Error::InvalidStatus);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let worker_key = DataKey::Worker(batch_id.clone(), worker.clone());
        if e.storage().persistent().has(&worker_key) {
            return Err(Error::WorkerExists);
        }
        batch.total_amount = batch
            .total_amount
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        batch.worker_count = batch
            .worker_count
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?;
        e.storage().persistent().set(
            &worker_key,
            &WorkerPayment {
                amount,
                claimed: false,
            },
        );
        e.storage().persistent().extend_ttl(
            &worker_key,
            BATCH_LIFETIME_THRESHOLD,
            BATCH_BUMP_LEDGERS,
        );
        Self::write_batch(&e, &batch_key, &batch);
        WorkerAdded {
            batch_id,
            worker,
            amount,
        }
        .publish(&e);
        Ok(())
    }

    pub fn fund(e: Env, batch_id: BytesN<32>) -> Result<(), Error> {
        let key = DataKey::Batch(batch_id.clone());
        let mut batch = Self::read_batch(&e, &key)?;
        batch.employer.require_auth();
        if batch.status != BatchStatus::Draft {
            return Err(Error::InvalidStatus);
        }
        if batch.total_amount <= 0 || batch.worker_count == 0 {
            return Err(Error::InvalidAmount);
        }
        token::Client::new(&e, &batch.asset).transfer(
            &batch.employer,
            &e.current_contract_address(),
            &batch.total_amount,
        );
        batch.status = BatchStatus::Funded;
        Self::write_batch(&e, &key, &batch);
        BatchFunded { batch_id }.publish(&e);
        Ok(())
    }

    pub fn claim(e: Env, batch_id: BytesN<32>, worker: Address) -> Result<i128, Error> {
        let batch_key = DataKey::Batch(batch_id.clone());
        let mut batch = Self::read_batch(&e, &batch_key)?;
        if batch.status != BatchStatus::Funded {
            return Err(Error::InvalidStatus);
        }
        let worker_key = DataKey::Worker(batch_id.clone(), worker.clone());
        let mut payment = e
            .storage()
            .persistent()
            .get::<DataKey, WorkerPayment>(&worker_key)
            .ok_or(Error::WorkerNotFound)?;
        if payment.claimed {
            return Err(Error::AlreadyClaimed);
        }
        worker.require_auth();
        token::Client::new(&e, &batch.asset).transfer(
            &e.current_contract_address(),
            &worker,
            &payment.amount,
        );
        payment.claimed = true;
        batch.claimed_amount = batch
            .claimed_amount
            .checked_add(payment.amount)
            .ok_or(Error::ArithmeticOverflow)?;
        batch.claimed_count = batch
            .claimed_count
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?;
        e.storage().persistent().set(&worker_key, &payment);
        e.storage().persistent().extend_ttl(
            &worker_key,
            BATCH_LIFETIME_THRESHOLD,
            BATCH_BUMP_LEDGERS,
        );
        Self::write_batch(&e, &batch_key, &batch);
        PayrollClaimed {
            batch_id,
            worker,
            amount: payment.amount,
        }
        .publish(&e);
        Ok(payment.amount)
    }

    pub fn close(e: Env, batch_id: BytesN<32>) -> Result<(), Error> {
        let key = DataKey::Batch(batch_id.clone());
        let mut batch = Self::read_batch(&e, &key)?;
        batch.employer.require_auth();
        if batch.status != BatchStatus::Funded {
            return Err(Error::InvalidStatus);
        }
        if batch.claimed_count != batch.worker_count {
            return Err(Error::NotFullyClaimed);
        }
        batch.status = BatchStatus::Closed;
        Self::write_batch(&e, &key, &batch);
        BatchClosed { batch_id }.publish(&e);
        Ok(())
    }

    pub fn refund(e: Env, batch_id: BytesN<32>) -> Result<i128, Error> {
        let key = DataKey::Batch(batch_id.clone());
        let mut batch = Self::read_batch(&e, &key)?;
        batch.employer.require_auth();
        if batch.status != BatchStatus::Funded {
            return Err(Error::InvalidStatus);
        }
        let remaining = batch
            .total_amount
            .checked_sub(batch.claimed_amount)
            .ok_or(Error::ArithmeticOverflow)?;
        if remaining <= 0 {
            return Err(Error::NothingToRefund);
        }
        token::Client::new(&e, &batch.asset).transfer(
            &e.current_contract_address(),
            &batch.employer,
            &remaining,
        );
        batch.status = BatchStatus::Refunded;
        Self::write_batch(&e, &key, &batch);
        BatchRefunded {
            batch_id,
            employer: batch.employer,
            amount: remaining,
        }
        .publish(&e);
        Ok(remaining)
    }

    pub fn get_batch(e: Env, batch_id: BytesN<32>) -> Result<Batch, Error> {
        Self::read_batch(&e, &DataKey::Batch(batch_id))
    }

    pub fn get_worker(
        e: Env,
        batch_id: BytesN<32>,
        worker: Address,
    ) -> Result<WorkerPayment, Error> {
        e.storage()
            .persistent()
            .get(&DataKey::Worker(batch_id, worker))
            .ok_or(Error::WorkerNotFound)
    }
}

impl BatchPayrollContract {
    fn read_admin(e: &Env) -> Result<Address, Error> {
        e.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    fn read_asset(e: &Env) -> Result<Address, Error> {
        e.storage()
            .instance()
            .get(&DataKey::Asset)
            .ok_or(Error::NotInitialized)
    }

    fn read_batch(e: &Env, key: &DataKey) -> Result<Batch, Error> {
        e.storage()
            .persistent()
            .get(key)
            .ok_or(Error::BatchNotFound)
    }

    fn write_batch(e: &Env, key: &DataKey, batch: &Batch) {
        e.storage().persistent().set(key, batch);
        e.storage()
            .persistent()
            .extend_ttl(key, BATCH_LIFETIME_THRESHOLD, BATCH_BUMP_LEDGERS);
    }
}

#[cfg(test)]
mod test {
    extern crate std;

    use super::{BatchPayrollContract, BatchPayrollContractClient, BatchStatus, Error};
    use soroban_sdk::{testutils::Address as _, token, Address, BytesN, Env};

    fn id(e: &Env, value: u8) -> BytesN<32> {
        BytesN::from_array(e, &[value; 32])
    }

    fn setup<'a>(
        e: &'a Env,
    ) -> (
        BatchPayrollContractClient<'a>,
        Address,
        Address,
        Address,
        Address,
    ) {
        let admin = Address::generate(e);
        let employer = Address::generate(e);
        let worker = Address::generate(e);
        let second_worker = Address::generate(e);
        let asset_admin = Address::generate(e);
        let asset = e.register_stellar_asset_contract_v2(asset_admin).address();
        let contract_id = e.register(BatchPayrollContract, ());
        let client = BatchPayrollContractClient::new(e, &contract_id);
        e.mock_all_auths();
        client.initialize(&admin, &asset);
        (client, admin, employer, worker, second_worker)
    }

    #[test]
    fn funded_batch_claims_and_closes() {
        let e = Env::default();
        let (client, _admin, employer, worker, second_worker) = setup(&e);
        let batch_id = id(&e, 1);

        client.create_batch(&batch_id, &employer);
        client.add_worker(&batch_id, &worker, &30);
        client.add_worker(&batch_id, &second_worker, &20);
        let asset = client.asset();
        let token_client = token::StellarAssetClient::new(&e, &asset);
        token_client.mint(&employer, &50);
        client.fund(&batch_id);
        assert_eq!(client.claim(&batch_id, &worker), 30);
        assert_eq!(
            client.try_close(&batch_id).unwrap_err().unwrap(),
            Error::NotFullyClaimed
        );
        assert_eq!(client.claim(&batch_id, &second_worker), 20);
        client.close(&batch_id);
        assert_eq!(client.get_batch(&batch_id).status, BatchStatus::Closed);
        assert_eq!(token_client.balance(&worker), 30);
    }

    #[test]
    fn duplicate_workers_and_claims_are_rejected() {
        let e = Env::default();
        let (client, _admin, employer, worker, second_worker) = setup(&e);
        let batch_id = id(&e, 2);

        client.create_batch(&batch_id, &employer);
        client.add_worker(&batch_id, &worker, &10);
        assert_eq!(
            client
                .try_add_worker(&batch_id, &worker, &10)
                .unwrap_err()
                .unwrap(),
            Error::WorkerExists
        );
        let asset = client.asset();
        let token_client = token::StellarAssetClient::new(&e, &asset);
        token_client.mint(&employer, &10);
        client.fund(&batch_id);
        assert_eq!(
            client
                .try_add_worker(&batch_id, &second_worker, &5)
                .unwrap_err()
                .unwrap(),
            Error::InvalidStatus
        );
        client.claim(&batch_id, &worker);
        assert_eq!(
            client.try_claim(&batch_id, &worker).unwrap_err().unwrap(),
            Error::AlreadyClaimed
        );
    }

    #[test]
    fn refund_returns_unclaimed_xlm_sac() {
        let e = Env::default();
        let (client, _admin, employer, worker, second_worker) = setup(&e);
        let batch_id = id(&e, 3);

        client.create_batch(&batch_id, &employer);
        client.add_worker(&batch_id, &worker, &30);
        client.add_worker(&batch_id, &second_worker, &20);
        let asset = client.asset();
        let token_client = token::StellarAssetClient::new(&e, &asset);
        token_client.mint(&employer, &50);
        client.fund(&batch_id);
        client.claim(&batch_id, &worker);
        assert_eq!(client.refund(&batch_id), 20);
        assert_eq!(client.get_batch(&batch_id).status, BatchStatus::Refunded);
        assert_eq!(token_client.balance(&employer), 20);
        assert_eq!(
            client.try_refund(&batch_id).unwrap_err().unwrap(),
            Error::InvalidStatus
        );
    }
}
