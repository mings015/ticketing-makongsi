import { and, eq } from 'drizzle-orm';
import { db } from './index';
import { categories, permissions, rolePermissions, roles, userRoles, users } from './schema';
import { hashPassword } from '../utils/password';
import { generateId } from '../utils/uuid';

const DEFAULT_CATEGORIES = [
  { code: 'HW', name: 'Hardware', description: 'Perangkat keras: laptop, printer, monitor, dll.' },
  { code: 'SW', name: 'Software', description: 'Aplikasi, lisensi, instalasi software.' },
  { code: 'NET', name: 'Network', description: 'Jaringan, internet, VPN, WiFi.' },
  { code: 'AR', name: 'Access Request', description: 'Permintaan akses aplikasi, database, atau sistem.' },
  { code: 'INF', name: 'Infrastructure', description: 'Server, cloud, backup, dan infrastruktur IT.' },
];

type RoleName = 'super_admin' | 'admin' | 'support' | 'employee';

const ROLE_NAMES: RoleName[] = ['super_admin', 'admin', 'support', 'employee'];

const ALL_PERMISSIONS: Array<{ resource: string; action: string }> = [
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'create' },
  { resource: 'users', action: 'update' },
  { resource: 'users', action: 'delete' },
  { resource: 'roles', action: 'assign' },
  { resource: 'tickets', action: 'read' },
  { resource: 'tickets', action: 'create' },
  { resource: 'tickets', action: 'update' },
  { resource: 'tickets', action: 'assign' },
  { resource: 'tickets', action: 'delete' },
  { resource: 'reports', action: 'read' },
];

const ROLE_PERMISSIONS: Record<RoleName, Array<{ resource: string; action: string }>> = {
  super_admin: ALL_PERMISSIONS,
  admin: [
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'update' },
    { resource: 'roles', action: 'assign' },
    { resource: 'tickets', action: 'read' },
    { resource: 'tickets', action: 'create' },
    { resource: 'tickets', action: 'update' },
    { resource: 'tickets', action: 'assign' },
    { resource: 'tickets', action: 'delete' },
    { resource: 'reports', action: 'read' },
  ],
  support: [
    { resource: 'tickets', action: 'read' },
    { resource: 'tickets', action: 'update' },
    { resource: 'tickets', action: 'assign' },
  ],
  employee: [
    { resource: 'tickets', action: 'read' },
    { resource: 'tickets', action: 'create' },
  ],
};

export async function runSeed() {
  console.log('[seed] Starting...');

  // Upsert roles
  const roleMap = new Map<RoleName, string>();
  for (const name of ROLE_NAMES) {
    const existing = await db.query.roles.findFirst({ where: eq(roles.name, name) });
    if (existing) {
      roleMap.set(name, existing.id);
    } else {
      const [created] = await db.insert(roles).values({ id: generateId(), name }).returning();
      roleMap.set(name, created.id);
      console.log(`[seed] Created role: ${name}`);
    }
  }

  // Upsert permissions
  const permMap = new Map<string, string>();
  for (const { resource, action } of ALL_PERMISSIONS) {
    const key = `${resource}:${action}`;
    const existing = await db.query.permissions.findFirst({
      where: and(eq(permissions.resource, resource), eq(permissions.action, action)),
    });
    if (existing) {
      permMap.set(key, existing.id);
    } else {
      const [created] = await db
        .insert(permissions)
        .values({ id: generateId(), resource, action })
        .returning();
      permMap.set(key, created.id);
      console.log(`[seed] Created permission: ${key}`);
    }
  }

  // Assign permissions to roles
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS) as Array<[RoleName, typeof ALL_PERMISSIONS]>) {
    const roleId = roleMap.get(roleName)!;
    for (const { resource, action } of perms) {
      const permId = permMap.get(`${resource}:${action}`)!;
      const exists = await db.query.rolePermissions.findFirst({
        where: and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permId)),
      });
      if (!exists) {
        await db.insert(rolePermissions).values({ id: generateId(), roleId, permissionId: permId });
      }
    }
  }
  console.log('[seed] Role permissions assigned');

  // Seed default super_admin user
  const adminEmail = 'admin@ticketing.local';
  const existingAdmin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });

  if (!existingAdmin) {
    const passwordHash = await hashPassword('Admin123!');
    const userId = generateId();
    await db.insert(users).values({
      id: userId,
      email: adminEmail,
      passwordHash,
      fullName: 'System Administrator',
      isActive: true,
    });

    const superAdminRoleId = roleMap.get('super_admin')!;
    await db.insert(userRoles).values({
      id: generateId(),
      userId,
      roleId: superAdminRoleId,
      assignedBy: userId,
    });

    console.log(`[seed] Created default user: ${adminEmail} (password: Admin123!)`);
  }

  // Seed default categories
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await db.query.categories.findFirst({
      where: and(eq(categories.code, cat.code)),
    });
    if (!existing) {
      await db.insert(categories).values({
        id: generateId(),
        name: cat.name,
        code: cat.code,
        description: cat.description,
        isActive: true,
      });
      console.log(`[seed] Created category: ${cat.code} - ${cat.name}`);
    }
  }

  console.log('[seed] Done.');
}
