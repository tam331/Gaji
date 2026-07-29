# Payroll Flow

1. The employer verifies worker names, Stellar addresses, and amounts.
2. The application generates a unique 32-byte batch identifier.
3. The employer signs `create_batch`.
4. Each worker and amount is added with `add_worker`.
5. The employer reviews the final total and signs `fund`.
6. An eligible worker signs `claim`.
7. The employer closes the completed batch with `close`.

Every transition is reconciled by transaction hash before the dashboard advances. A refund path is available only when contract state permits it and should be handled as a separate operational action.
