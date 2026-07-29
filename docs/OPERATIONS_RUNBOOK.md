# Operations Runbook

## Prepare

- Verify each worker address out of band.
- Check amounts and decimal conversion.
- Generate a unique batch identifier.
- Confirm the employer wallet and Mainnet network.

## Execute

- Reconcile `create_batch` before adding workers.
- Read batch totals after the final worker.
- Simulate `fund` and review the transfer amount.
- Record every worker claim hash.
- Close only when contract state is complete.

## Recover

When a submission is uncertain, query its hash and read the batch before retrying. Preserve failed hashes and contract errors. Never recreate a batch solely because the UI did not refresh.
