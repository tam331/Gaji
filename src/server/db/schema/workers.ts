import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { employers } from './employers';

export const WORKER_STATUSES = ['new', 'registered'] as const;
export type WorkerStatus = (typeof WORKER_STATUSES)[number];
export const workerStatusEnum = pgEnum('worker_status', WORKER_STATUSES);

export const workers = pgTable(
  'workers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employerId: uuid('employer_id')
      .notNull()
      .references(() => employers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    stellarAddress: text('stellar_address').notNull(),
    phone: text('phone'),
    bankAccount: text('bank_account'),
    status: workerStatusEnum('status').notNull().default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    employerIdx: index('workers_employer_idx').on(t.employerId),
    statusIdx: index('workers_status_idx').on(t.status),
  }),
);

export type Worker = typeof workers.$inferSelect;
export type NewWorker = typeof workers.$inferInsert;
