# SME Batch Payroll

Batch payroll preparation and reconciliation for small businesses paying workers in Stellar assets.

## Why it exists

Small businesses often manage contractor payroll from spreadsheets and chat threads. Gaji gives an employer one compact workspace to upload a roster, review the total, and follow each worker's payment status.

## Demo & live preview

- Public demo: [gaji-024.vercel.app](https://gaji-024.vercel.app)
- Demo account: Fatimah's BPO Solutions
- Demo roster: 5 workers receiving 150 USDC each
- Demo mode uses in-memory data so the preview works without a database or wallet

The public preview is intentionally focused on the product flow. Wallet signing and mainnet broadcasting are deferred until the employer, worker addresses, asset issuer, and settlement provider are configured.

## Stellar surface

- Classic Stellar USDC is represented with seven-decimal stroops (`1 USDC = 10,000,000`)

- Batch payment and claimable-balance intent preparation
- Exact Horizon reconciliation per worker and batch
- External signer boundary; no application-held private key
- Real batch path: `POST /api/payroll-runs/:id/prepare` returns unsigned XDR, and `POST /api/payroll-runs/:id/confirm` verifies the employer signature and exact operations before Horizon submission

## Readiness status

This repository is in hackathon readiness hardening. Simulated payroll streaming and cash-out are disabled outside non-public demo mode. No mainnet payroll proof is claimed.

See [`docs/MAINNET_READINESS.md`](docs/MAINNET_READINESS.md).

## How a demo run works

1. Open the dashboard and review payroll totals and previous runs.
2. Start a new run with a CSV roster or the sample roster.
3. Review worker names, addresses, and USDC amounts.
4. Fund the run in demo mode and watch the staged disbursement status update.

## Local demo

The public preview runs in demo mode with in-memory payroll data, so the dashboard and staged disbursement flow work without a database or wallet. For a local run, install dependencies and use `npm run dev`.

## Screens

### Dashboard

![Gaji dashboard](screen-shot/02-dashboard.jpg)

### New payroll roster

![New payroll roster](screen-shot/04-payroll-new.jpg)

### Worker preview before disbursement

![Payroll preview](screen-shot/05-payroll-preview.jpg)

### Mobile dashboard

![Gaji mobile dashboard](screen-shot/06-mobile-dashboard.jpg)

Screens are captured from the local production build that powers the public preview.

Keep all secrets outside Git.

## Mainnet gate

Mainnet requires worker/address verification, an externally signed batch, exact Horizon payment proofs, idempotency, and a reviewed provider settlement integration.

Apply `drizzle/0001_unsigned_payroll_intents.sql` before using the batch intent routes.
