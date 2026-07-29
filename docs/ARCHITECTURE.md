# Architecture

Gaji separates payroll preparation, wallet authorization, contract custody, and ledger reconciliation.

## Components

- Next.js dashboard prepares rosters and presents batch status.
- Freighter signs employer and worker actions.
- `batch-payroll` stores batch and worker-payment state.
- Native XLM SAC transfers funds into and out of contract custody.
- Stellar RPC submits invocations; Horizon and explorers confirm results.

## Mainnet path

`roster review → batch invocation → wallet approval → contract transition → event → reconciliation`

Demo records help present the workflow. The deployed contract and successful transaction hashes are authoritative for Mainnet activity.
