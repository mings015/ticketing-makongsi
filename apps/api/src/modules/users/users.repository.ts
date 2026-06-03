import { and, count, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import type { Database } from '../../shared/database';
import {
  auditLogs,
  refreshTokens,
  roles,
  userRoles,
  users,
} from '../../shared/database/schema';
import type { NewAuditLog, NewUser } from '../../shared/database/schema';

type ListParams = {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  isActive?: boolean;
};

export class UsersRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const user = await this.db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
      columns: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: false,
      },
    });
    if (!user) return null;

    const userRoleRows = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, id));

    return { ...user, roles: userRoleRows.map((r) => r.name) };
  }

  async findByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
      columns: { id: true, email: true },
    });
  }

  async listUsers({ page, limit, search, role, isActive }: ListParams) {
    const offset = (page - 1) * limit;

    const conditions = [isNull(users.deletedAt)];
    if (search) {
      conditions.push(
        or(ilike(users.fullName, `%${search}%`), ilike(users.email, `%${search}%`))!,
      );
    }
    if (isActive !== undefined) {
      conditions.push(eq(users.isActive, isActive));
    }

    const where = and(...conditions);

    // If filtering by role, get matching user IDs first
    let roleFilterIds: string[] | undefined;
    if (role) {
      const filtered = await this.db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .innerJoin(users, eq(userRoles.userId, users.id))
        .where(and(eq(roles.name, role), isNull(users.deletedAt)));

      roleFilterIds = filtered.map((r) => r.userId);
      if (roleFilterIds.length === 0) return { data: [], total: 0 };
    }

    const finalWhere =
      roleFilterIds !== undefined
        ? and(where, inArray(users.id, roleFilterIds))
        : where;

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(users)
      .where(finalWhere);

    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(finalWhere)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt);

    if (rows.length === 0) {
      return { data: [], total: Number(totalRow.count) };
    }

    const rolesByUser = await this.db
      .select({ userId: userRoles.userId, roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(inArray(userRoles.userId, rows.map((r) => r.id)));

    const rolesMap = new Map<string, string[]>();
    for (const { userId, roleName } of rolesByUser) {
      const arr = rolesMap.get(userId) ?? [];
      arr.push(roleName);
      rolesMap.set(userId, arr);
    }

    const data = rows.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      roles: rolesMap.get(u.id) ?? [],
    }));

    return { data, total: Number(totalRow.count) };
  }

  async createUser(data: NewUser) {
    const [user] = await this.db.insert(users).values(data).returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      createdAt: users.createdAt,
    });
    return user;
  }

  async updateUser(id: string, data: { fullName?: string; email?: string }) {
    const [updated] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        updatedAt: users.updatedAt,
      });
    return updated;
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async setActiveStatus(id: string, isActive: boolean) {
    await this.db
      .update(users)
      .set({
        isActive,
        ...(isActive ? { failedLoginAttempts: 0, lockedUntil: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async softDeleteUser(id: string) {
    await this.db
      .update(users)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async assignRole(userId: string, roleId: string, assignedBy: string) {
    const exists = await this.db.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)),
    });
    if (exists) return;

    const { generateId } = await import('../../shared/utils/uuid');
    await this.db.insert(userRoles).values({ id: generateId(), userId, roleId, assignedBy });
  }

  async removeRole(userId: string, roleId: string) {
    await this.db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }

  async countUserRoles(userId: string) {
    const [row] = await this.db
      .select({ count: count() })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    return Number(row.count);
  }

  async getUserRoles(userId: string) {
    const rows = await this.db
      .select({ name: roles.name, id: roles.id })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    return rows;
  }

  async findRoleByName(name: string) {
    return this.db.query.roles.findFirst({ where: eq(roles.name, name) });
  }

  async findRoleById(id: string) {
    return this.db.query.roles.findFirst({ where: eq(roles.id, id) });
  }

  async isSuperAdmin(userId: string) {
    const superAdminRole = await this.findRoleByName('super_admin');
    if (!superAdminRole) return false;
    const row = await this.db.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, userId), eq(userRoles.roleId, superAdminRole.id)),
    });
    return !!row;
  }

  async countSuperAdmins() {
    const superAdminRole = await this.findRoleByName('super_admin');
    if (!superAdminRole) return 0;
    const [row] = await this.db
      .select({ count: count() })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(and(eq(userRoles.roleId, superAdminRole.id), isNull(users.deletedAt)));
    return Number(row.count);
  }

  async revokeAllRefreshTokens(userId: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async createAuditLog(data: NewAuditLog) {
    await this.db.insert(auditLogs).values(data);
  }
}
