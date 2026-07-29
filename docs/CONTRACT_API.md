# Contract API

Contract: `CBD3NXEYRBUNF72EZ2NOSZH4W6CNKVMVK25A53NF5VQNKK6SLMYUC6DG`

## Setup and reads

- `initialize(admin, asset)` configures the contract once.
- `admin()` and `asset()` return configuration.
- `get_batch(batch_id)` returns batch totals and status.
- `get_worker(batch_id, worker)` returns one worker payment.

## Payroll lifecycle

- `create_batch(batch_id, employer)` opens a batch.
- `add_worker(batch_id, worker, amount)` appends a worker amount.
- `fund(batch_id)` transfers the batch total from the employer.
- `claim(batch_id, worker)` transfers an eligible payment.
- `close(batch_id)` closes a completed batch.
- `refund(batch_id)` returns eligible remaining funds.

Batch IDs are 32 bytes. Amounts are integer stroops.
