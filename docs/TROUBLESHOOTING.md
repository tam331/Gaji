# Troubleshooting

## Worker cannot be added

Confirm the batch is open, the amount is positive, and the address is not already present.

## Funding fails

Check the final total, employer authorization, available XLM, and current batch status.

## Claim fails

Confirm the caller matches the worker, the batch is funded, and the payment was not already claimed.

## Close fails

Read batch state and verify all required claims or closing conditions are complete.

## Transaction expires

Build and simulate a fresh envelope.

## RPC times out

Search the original hash before retrying; the transaction may already be confirmed.
