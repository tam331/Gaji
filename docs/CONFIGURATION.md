# Configuration

Production uses Stellar Mainnet and the deployed contract:

`CBD3NXEYRBUNF72EZ2NOSZH4W6CNKVMVK25A53NF5VQNKK6SLMYUC6DG`

## Rules

- Use a Mainnet Soroban RPC endpoint and Public network passphrase.
- Validate the Contract ID against the deployment manifest.
- Keep public identifiers separate from server-only database variables.
- Never configure a wallet secret in Vercel or browser code.
- Apply `drizzle/0001_unsigned_payroll_intents.sql` before database-backed unsigned-intent routes.
- Treat database records as projections until their transaction hashes are reconciled.

Rebuild pending envelopes after any network or account change.
