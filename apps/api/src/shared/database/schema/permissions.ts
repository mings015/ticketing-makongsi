import { pgTable, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const permissions = pgTable(
  'permissions',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => uuidv7()),
    resource: varchar('resource', { length: 100 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique('permissions_resource_action_unique').on(t.resource, t.action)],
);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
