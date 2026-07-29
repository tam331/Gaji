# Events

The contract emits events for initialization, batch creation, worker addition, funding, claim, close, and refund.

## Consumer rules

1. Filter by the exact Mainnet Contract ID.
2. Store transaction hash, ledger sequence, and event position.
3. Process the same event idempotently.
4. Match worker and amount to the payroll projection.
5. Read current batch state after event processing.

Events drive activity feeds and reconciliation queues. They do not replace direct state reads when processing resumes after an outage.
