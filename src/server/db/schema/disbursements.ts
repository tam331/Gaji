import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { payrollRuns } from './payrollRuns';
import { workers } from './workers';

export const DISBURSEMENT_STATUSES = ['pending', 'claimed', 'completed', 'failed'] as const;
export type DisbursementStatus = (typeof DISBURSEMENT_STATUSES)[number];
export const disbursementStatusEnum = pgEnum('disbursement_status', DISBURSEMENT_STATUSES);

export const disbursements = pgTable(
  'disbursements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    payrollRunId: uuid('payroll_run_id')
      .notNull()
      .references(() => payrollRuns.id, { onDelete: 'cascade' }),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    amountUsdc: text('amount_usdc').notNull(),
    status: disbursementStatusEnum('status').notNull().default('pending'),
    claimableBalanceId: text('claimable_balance_id'),
    stellarTxHash: text('stellar_tx_hash'),
    cashedOutAt: timestamp('cashed_out_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    payrollRunIdx: index('disbursements_payroll_run_idx').on(t.payrollRunId),
    workerIdx: index('disbursements_worker_idx').on(t.workerId),
    statusIdx: index('disbursements_status_idx').on(t.status),
  }),
);

export type Disbursement = typeof disbursements.$inferSelect;
export type NewDisbursement = typeof disbursements.$inferInsert;
