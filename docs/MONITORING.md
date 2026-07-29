# Monitoring

## Availability

Track the public app, RPC latency, submission errors, and confirmation delay.

## Payroll state

Track batches created, workers added, total funded, claims confirmed, batches closed, refunds, and failed simulations.

## Reconciliation

Alert when the dashboard differs from `get_batch`, a confirmed event is not projected, or a worker appears paid without a successful claim hash.

## Privacy

Metrics should use batch identifiers and addresses only where operationally necessary. Do not log wallet secrets, unnecessary signed XDR, or payroll personal data.
