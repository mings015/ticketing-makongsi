import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const categories = pgTable('categories', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => uuidv7()),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
