import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { employers } from './employers';

export const PAYROLL_RUN_STATUSES = ['draft', 'funded', 'disbursing', 'completed'] as const;
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];
export const payrollRunStatusEnum = pgEnum('payroll_run_status', PAYROLL_RUN_STATUSES);

export const payrollRuns = pgTable(
  'payroll_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employerId: uuid('employer_id')
      .notNull()
      .references(() => employers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    totalUsdc: text('total_usdc').notNull(),
    workerCount: integer('worker_count').notNull().default(0),
    status: payrollRunStatusEnum('status').notNull().default('draft'),
    stellarTxHash: text('stellar_tx_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    employerIdx: index('payroll_runs_employer_idx').on(t.employerId),
    statusIdx: index('payroll_runs_status_idx').on(t.status),
  }),
);

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type NewPayrollRun = typeof payrollRuns.$inferInsert;
