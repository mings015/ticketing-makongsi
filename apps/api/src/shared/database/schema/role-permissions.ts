import { pgTable, timestamp, unique, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { permissions } from './permissions';
import { roles } from './roles';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => uuidv7()),
    roleId: varchar('role_id', { length: 36 })
      .notNull()
      .references(() => roles.id),
    permissionId: varchar('permission_id', { length: 36 })
      .notNull()
      .references(() => permissions.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique('role_permissions_role_permission_unique').on(t.roleId, t.permissionId)],
);

export type RolePermission = typeof rolePermissions.$inferSelect;
