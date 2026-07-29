# Security Boundaries

- The application never stores employer or worker secret keys.
- Wallet authorization is required for privileged transitions.
- Worker addresses must be verified before funding.
- Amount conversion must be deterministic and use integer stroops.
- A successful wallet signature is not final settlement; reconciliation is required.
- Batch identifiers must not collide.
- Uncertain submissions must be checked before retrying.
- Logs must avoid payroll personal data and signed transaction envelopes.

Identity checks, employment compliance, tax reporting, and formal contract audit are external production controls beyond this functional deployment.
