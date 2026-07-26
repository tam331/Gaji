# Mainnet readiness

Concept: reviewed batch payroll payments in Stellar USDC with per-recipient reconciliation.

Current evidence: the project now has an unsigned multi-payment XDR path and exact externally signed batch verification; no verified mainnet deployment/asset evidence exists, and demo records must not be treated as chain settlement.

Required gates: apply the unsigned payroll migration, build a normalized payment manifest, require human review and external signing, verify every payment operation on Horizon, add idempotency/retry/reconciliation, and record funded testnet/mainnet proof.

Status: **not mainnet-ready**. Demo seed execution is blocked on public network unless `DEMO_MODE=true`.
