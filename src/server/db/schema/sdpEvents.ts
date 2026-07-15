import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { disbursements } from './disbursements';

export const sdpEvents = pgTable(
  'sdp_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    disbursementId: uuid('disbursement_id')
      .notNull()
      .references(() => disbursements.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    disbursementIdx: index('sdp_events_disbursement_idx').on(t.disbursementId),
  }),
);

export type SdpEvent = typeof sdpEvents.$inferSelect;
export type NewSdpEvent = typeof sdpEvents.$inferInsert;
