import { pgTable, timestamp, unique, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { roles } from './roles';
import { users } from './users';

export const userRoles = pgTable(
  'user_roles',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => uuidv7()),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    roleId: varchar('role_id', { length: 36 })
      .notNull()
      .references(() => roles.id),
    assignedBy: varchar('assigned_by', { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique('user_roles_user_role_unique').on(t.userId, t.roleId)],
);

export type UserRole = typeof userRoles.$inferSelect;
