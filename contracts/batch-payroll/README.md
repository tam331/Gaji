# Gaji batch-payroll contract

This is the bounded Soroban slice for project 024. It stores a payroll batch,
worker amounts, claim state, and the employer's funding/refund lifecycle. The
configured asset is native XLM SAC.

```text
create_batch -> add_worker* -> fund -> claim*
                                      |-> close (all claimed)
                                      \-> refund (unclaimed remainder)
```

The employer authorizes batch creation, roster changes, funding, closing, and
refund. Each worker authorizes only their own claim. Worker IDs are keyed by
`(batch_id, worker)` so duplicate roster entries and duplicate claims fail.

## Local verification

```bash
cargo fmt --manifest-path contracts/batch-payroll/Cargo.toml -- --check
cargo test --manifest-path contracts/batch-payroll/Cargo.toml
```

The tests use a Soroban Stellar Asset Contract test double. Configure the
native XLM SAC from the runbook for Testnet.
