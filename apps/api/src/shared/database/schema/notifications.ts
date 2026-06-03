import { pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { tickets } from './tickets';
import { users } from './users';

export const notificationTypeEnum = pgEnum('notification_type', [
  'ticket_created',
  'ticket_assigned',
  'ticket_updated',
  'ticket_resolved',
  'ticket_closed',
  'comment_added',
]);

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => uuidv7()),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  ticketId: varchar('ticket_id', { length: 36 }).references(() => tickets.id),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
