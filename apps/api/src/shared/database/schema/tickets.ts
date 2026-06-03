import { pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { categories } from './categories';
import { users } from './users';

export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed',
]);

export const ticketPriorityEnum = pgEnum('ticket_priority', [
  'low',
  'medium',
  'high',
  'critical',
]);

export const tickets = pgTable('tickets', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => uuidv7()),
  ticketNumber: varchar('ticket_number', { length: 20 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: ticketStatusEnum('status').notNull().default('open'),
  priority: ticketPriorityEnum('priority').notNull().default('medium'),
  categoryId: varchar('category_id', { length: 36 }).references(() => categories.id),
  requesterId: varchar('requester_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  assigneeId: varchar('assignee_id', { length: 36 }).references(() => users.id),
  dueAt: timestamp('due_at'),
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];
export type TicketPriority = (typeof ticketPriorityEnum.enumValues)[number];
