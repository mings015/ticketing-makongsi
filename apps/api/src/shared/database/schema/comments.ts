import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { tickets } from './tickets';
import { users } from './users';

export const comments = pgTable('comments', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => uuidv7()),
  ticketId: varchar('ticket_id', { length: 36 })
    .notNull()
    .references(() => tickets.id),
  authorId: varchar('author_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  isInternal: boolean('is_internal').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
