# Data Model

## Batch

A batch stores its employer, accumulated total, lifecycle status, and worker-payment references under a unique 32-byte identifier.

## Worker payment

Each worker payment stores the destination address, amount, and claim state. A worker can claim an eligible payment once.

## Status

Status controls whether workers can be added, funds can be deposited, claims can execute, and the batch can close or refund.

## Application projection

Worker display names, CSV rows, and UI status are off-chain projections. Contract addresses, amounts, and claim state are authoritative and should be refreshed after each confirmed action.
