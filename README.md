# SME Batch Payroll

Batch payroll preparation and reconciliation for small businesses paying workers in Stellar assets.

## Stellar surface

- Classic Stellar USDC is represented with seven-decimal stroops (`1 USDC = 10,000,000`)

- Batch payment and claimable-balance intent preparation
- Exact Horizon reconciliation per worker and batch
- External signer boundary; no application-held private key
- Real batch path: `POST /api/payroll-runs/:id/prepare` returns unsigned XDR, and `POST /api/payroll-runs/:id/confirm` verifies the employer signature and exact operations before Horizon submission

## Readiness status

This repository is in hackathon readiness hardening. Simulated payroll streaming and cash-out are disabled outside non-public demo mode. No mainnet payroll proof is claimed.

See [`docs/MAINNET_READINESS.md`](docs/MAINNET_READINESS.md).

## Local demo

The public preview runs in demo mode with in-memory payroll data, so the dashboard and staged disbursement flow work without a database or wallet. For a local run, install dependencies and use `npm run dev`.

## Screenshots

Screenshots will be refreshed after the first public deployment. Wallet signing and mainnet broadcasting are intentionally deferred from this demo.

Keep all secrets outside Git.

## Mainnet gate

Mainnet requires worker/address verification, an externally signed batch, exact Horizon payment proofs, idempotency, and a reviewed provider settlement integration.

Apply `drizzle/0001_unsigned_payroll_intents.sql` before using the batch intent routes.
