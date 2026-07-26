import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const employers = pgTable('employers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  stellarAddress: text('stellar_address').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Employer = typeof employers.$inferSelect;
export type NewEmployer = typeof employers.$inferInsert;
