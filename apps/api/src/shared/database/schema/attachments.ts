import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { tickets } from './tickets';
import { users } from './users';

export const attachments = pgTable('attachments', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => uuidv7()),
  ticketId: varchar('ticket_id', { length: 36 })
    .notNull()
    .references(() => tickets.id),
  uploadedBy: varchar('uploaded_by', { length: 36 })
    .notNull()
    .references(() => users.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  storedName: varchar('stored_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 1000 }).notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
