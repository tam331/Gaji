import {
  Address,
  Contract,
  Networks,
  nativeToScVal,
  rpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

export const BATCH_PAYROLL_CONTRACT = 'CBD3NXEYRBUNF72EZ2NOSZH4W6CNKVMVK25A53NF5VQNKK6SLMYUC6DG';
export const MAINNET_RPC_URL = 'https://soroban-rpc.mainnet.stellar.gateway.fm';
export const MAINNET_PASSPHRASE = Networks.PUBLIC;

export type PayrollWorker = { stellarAddress: string; amountUsdc: string };

export async function prepareMainnetBatch(
  sourceAddress: string,
  batchId: Uint8Array,
  workers: PayrollWorker[],
) {
  const server = new rpc.Server(MAINNET_RPC_URL);
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(BATCH_PAYROLL_CONTRACT);
  const batch = xdr.ScVal.scvBytes(Buffer.from(batchId));
  const operations = [contract.call('create_batch', batch, new Address(sourceAddress).toScVal())];
  for (const worker of workers) {
    operations.push(
      contract.call(
        'add_worker',
        batch,
        new Address(worker.stellarAddress).toScVal(),
        nativeToScVal(BigInt(Math.round(Number(worker.amountUsdc) * 10_000_000)), { type: 'i128' }),
      ),
    );
  }
  operations.push(contract.call('fund', batch));
  const raw = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: MAINNET_PASSPHRASE,
  }).addOperation(operations[0]);
  for (const operation of operations.slice(1)) raw.addOperation(operation);
  const built = raw.setTimeout(300).build();
  const simulation = await server.simulateTransaction(built);
  if ('error' in simulation && simulation.error) throw new Error(simulation.error);
  return rpc.assembleTransaction(built, simulation).build();
}

export async function submitMainnetBatch(signedXdr: string) {
  return new rpc.Server(MAINNET_RPC_URL).sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, MAINNET_PASSPHRASE),
  );
}
