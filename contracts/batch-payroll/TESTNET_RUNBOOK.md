# Project 024 Testnet runbook

Use a disposable Testnet account and Freighter/Stellar Lab for signatures.
Share public keys only; never put a private key in the project or automation.

## Native XLM SAC

For Testnet, configure:

```text
CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Build, upload, deploy, initialize

```bash
rustup target add wasm32v1-none
cargo build --manifest-path contracts/batch-payroll/Cargo.toml \
  --target wasm32v1-none --release

stellar contract info hash \
  --wasm contracts/batch-payroll/target/wasm32v1-none/release/gaji_batch_payroll.wasm

stellar contract upload \
  --wasm contracts/batch-payroll/target/wasm32v1-none/release/gaji_batch_payroll.wasm \
  --source-account <TESTNET_PUBLIC_KEY> --network testnet --sign-with-lab

stellar contract deploy --wasm-hash <WASM_HASH> \
  --source-account <TESTNET_PUBLIC_KEY> --network testnet --sign-with-lab

stellar contract invoke --id <CONTRACT_ID> \
  --source-account <TESTNET_PUBLIC_KEY> --network testnet --sign-with-lab \
  -- initialize --admin <TESTNET_PUBLIC_KEY> \
  --asset CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Functional smoke flow

1. Employer calls `create_batch` with a unique batch ID.
2. Employer adds positive worker amounts with `add_worker`.
3. Employer signs `fund`, which transfers the total XLM SAC amount into the
   contract.
4. Each worker calls `claim` once; verify exact amounts.
5. Call `close` after every worker claims, or use `refund` after partial claims
   to return the unclaimed remainder to the employer.
6. Repeat a worker or claim call to confirm duplicate protection.

Simulate and assemble every Soroban invocation before signing. For an already
assembled XDR imported into Stellar Lab, select `Auth mode: Enforce`; `Record`
cannot be combined with an existing authorization footprint.

## Unsigned operation boundary

The web app should build and return unsigned XDR, never a secret key. Use the
CLI's `--build-only` option or the Stellar SDK, then simulate and assemble the
XDR before handing it to Freighter:

```bash
stellar contract invoke --id <CONTRACT_ID> \
  --source-account <TESTNET_PUBLIC_KEY> --network testnet --build-only \
  -- fund --batch-id <32_BYTE_ID>
```

The browser wallet signs the assembled transaction. The server may reconcile
the submitted hash and exact contract state, but it must not sign or broadcast
on behalf of the user without an explicit wallet approval flow.
