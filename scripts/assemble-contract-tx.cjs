const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  Address,
  nativeToScVal,
  Networks,
  Operation,
  TransactionBuilder,
  rpc,
} = require('@stellar/stellar-sdk');

const SOURCE = 'GCXTOGDALASO6UH3Q5T65YWHSIVD2QB57H4X4XRNLYMM3J2RMRCW4QWN';
const ROOT = path.resolve(__dirname, '..');
const WASM_PATH = path.resolve(ROOT, 'contracts/batch-payroll/target/wasm32v1-none/release/gaji_batch_payroll.wasm');
const WASM_HASH = 'de0cb69c85f57cb47851536dc1dda616c3399f4164f034a27a0c2b6c665cf8f1';
const NATIVE_XLM_SAC = 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA';
const BATCH_ID = crypto.createHash('sha256').update('024-gaji-demo-batch-v1').digest();
const BATCH_ID_SCVAL = nativeToScVal(BATCH_ID, { type: 'bytes' });

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function config() {
  const network = option('network', 'mainnet');
  if (!['mainnet', 'testnet'].includes(network)) throw new Error('Use --network mainnet or testnet');
  return network === 'mainnet'
    ? { rpcUrl: 'https://soroban-rpc.mainnet.stellar.gateway.fm', passphrase: Networks.PUBLIC, timeout: 86400 }
    : { rpcUrl: 'https://soroban-testnet.stellar.org:443', passphrase: Networks.TESTNET, timeout: 1800 };
}

function outputPath(stage, network) {
  return path.resolve(ROOT, `contracts/batch-payroll/${network}-${stage}-assembled.xdr`);
}

async function main() {
  const stage = option('stage');
  const allowed = ['upload', 'deploy', 'initialize', 'create-batch', 'add-worker', 'fund', 'claim', 'close'];
  if (!allowed.includes(stage)) throw new Error(`Usage: node scripts/assemble-contract-tx.cjs --stage ${allowed.join('|')} --network mainnet [--contract-id C...]`);

  const network = option('network', 'mainnet');
  const settings = config();
  const server = new rpc.Server(settings.rpcUrl);
  const account = await server.getAccount(SOURCE);
  const builder = new TransactionBuilder(account, { fee: '100', networkPassphrase: settings.passphrase });

  if (stage === 'upload') {
    builder.addOperation(Operation.uploadContractWasm({ wasm: fs.readFileSync(WASM_PATH) }));
  } else if (stage === 'deploy') {
    builder.addOperation(Operation.createCustomContract({
      address: Address.fromString(SOURCE),
      wasmHash: Buffer.from(WASM_HASH, 'hex'),
      salt: crypto.createHash('sha256').update('024-gaji-batch-payroll-v1').digest(),
    }));
  } else {
    const contractId = option('contract-id');
    if (!contractId) throw new Error(`--contract-id C... is required for ${stage}`);
    const worker = option('worker', SOURCE);
    if (stage === 'initialize') {
      builder.addOperation(Operation.invokeContractFunction({
        contract: contractId,
        function: 'initialize',
        args: [Address.fromString(SOURCE).toScVal(), Address.fromString(NATIVE_XLM_SAC).toScVal()],
      }));
    } else if (stage === 'create-batch') {
      builder.addOperation(Operation.invokeContractFunction({
        contract: contractId,
        function: 'create_batch',
        args: [BATCH_ID_SCVAL, Address.fromString(SOURCE).toScVal()],
      }));
    } else if (stage === 'add-worker') {
      builder.addOperation(Operation.invokeContractFunction({
        contract: contractId,
        function: 'add_worker',
        args: [BATCH_ID_SCVAL, Address.fromString(worker).toScVal(), nativeToScVal(BigInt(option('amount', '1000000')), { type: 'i128' })],
      }));
    } else if (stage === 'fund') {
      builder.addOperation(Operation.invokeContractFunction({
        contract: contractId,
        function: 'fund',
        args: [BATCH_ID_SCVAL],
      }));
    } else if (stage === 'claim') {
      builder.addOperation(Operation.invokeContractFunction({
        contract: contractId,
        function: 'claim',
        args: [BATCH_ID_SCVAL, Address.fromString(worker).toScVal()],
      }));
    } else if (stage === 'close') {
      builder.addOperation(Operation.invokeContractFunction({
        contract: contractId,
        function: 'close',
        args: [BATCH_ID_SCVAL],
      }));
    }
  }

  const raw = builder.setTimeout(settings.timeout).build();
  const simulation = await server.simulateTransaction(raw);
  if (simulation.error) throw new Error(simulation.error);
  const assembled = rpc.assembleTransaction(raw, simulation).build();
  const xdr = assembled.toXDR();
  const destination = outputPath(stage, network);
  fs.writeFileSync(destination, `${xdr}\n`, { mode: 0o600 });
  const result = stage === 'deploy' ? simulation.result?.retval : null;
  console.log(JSON.stringify({
    stage, network, outputPath: destination, xdr,
    hash: assembled.hash().toString('hex'), sequence: assembled.sequence.toString(),
    contractId: result ? Address.fromScVal(result).toString() : null,
    batchId: BATCH_ID.toString('hex'), wasmSha256: stage === 'upload' ? WASM_HASH : undefined,
    minResourceFee: simulation.minResourceFee, latestLedger: simulation.latestLedger,
  }, null, 2));
}

main().catch((error) => { console.error(error.stack || error.message || error); process.exitCode = 1; });
