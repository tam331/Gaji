# Failure Modes

- Duplicate batch ID: allocate a new identifier.
- Invalid worker or amount: correct the roster before funding.
- Wrong employer signer: reconnect the configured employer account.
- Insufficient balance: fund the employer wallet and prepare a fresh transaction.
- Duplicate claim: treat the existing successful claim as final.
- Premature close: reconcile outstanding worker state.
- Expired XDR: rebuild with current sequence and time bounds.
- RPC timeout: query the hash before retrying.
- UI mismatch: refresh from `get_batch` and `get_worker`.
- Indexer delay: wait for ledger indexing without duplicating the payment.

Every incident record should preserve the hash, batch ID, action, and error.
