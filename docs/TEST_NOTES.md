# Test Notes

Contract tests cover the batch-payroll state machine.

## Core behavior

- Initialize admin and asset.
- Create a batch and add worker payments.
- Calculate and fund the batch total.
- Allow each eligible worker to claim once.
- Close a completed batch.
- Reject invalid status transitions and duplicate claims.

## Commands

```sh
cd contracts/batch-payroll
cargo test
cargo build --release --target wasm32v1-none
```

Application:

```sh
npm test
npm run build
```

Mainnet hashes prove execution of the complete documented flow.
