import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../shared/database';
import { auditLogs, refreshTokens, roles, userRoles, users } from '../../shared/database/schema';
import type { NewAuditLog, NewRefreshToken } from '../../shared/database/schema';

export class AuthRepository {
  constructor(private readonly db: Database) {}

  async findUserByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
      columns: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
  }

  async findUserById(id: string) {
    return this.db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
      columns: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });
  }

  async findActiveRefreshToken(tokenHash: string) {
    return this.db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    });
  }

  async createRefreshToken(data: NewRefreshToken) {
    const [token] = await this.db.insert(refreshTokens).values(data).returning();
    return token;
  }

  async revokeRefreshToken(id: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id));
  }

  async revokeAllUserRefreshTokens(userId: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async incrementLoginAttempts(userId: string) {
    await this.db
      .update(users)
      .set({
        failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async resetLoginAttempts(userId: string) {
    await this.db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async lockAccount(userId: string, until: Date) {
    await this.db
      .update(users)
      .set({ lockedUntil: until, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createAuditLog(data: NewAuditLog) {
    await this.db.insert(auditLogs).values(data);
  }

  async getUserRoles(userId: string) {
    const result = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return result.map((r) => r.name);
  }
}
