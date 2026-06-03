import { and, count, desc, eq, gte, ilike, isNull, lte, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '../../shared/database';
import { auditLogs, users } from '../../shared/database/schema';

const actorAlias = alias(users, 'actor');

export type AuditLogFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  action?: string;
  actorId?: string;
  targetType?: string;
  search?: string;
};

export class AuditLogsRepository {
  constructor(private readonly db: Database) {}

  private buildConditions(f: AuditLogFilters) {
    const conds = [];
    if (f.dateFrom)    conds.push(gte(auditLogs.createdAt, f.dateFrom));
    if (f.dateTo)      conds.push(lte(auditLogs.createdAt, f.dateTo));
    if (f.action)      conds.push(eq(auditLogs.action, f.action));
    if (f.actorId)     conds.push(eq(auditLogs.actorId, f.actorId));
    if (f.targetType)  conds.push(eq(auditLogs.targetType, f.targetType));
    if (f.search) {
      conds.push(
        or(
          ilike(auditLogs.action, `%${f.search}%`),
          ilike(auditLogs.targetType, `%${f.search}%`),
        )!,
      );
    }
    return conds;
  }

  async findAll(f: AuditLogFilters, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const conds = this.buildConditions(f);
    const where = conds.length > 0 ? and(...conds) : undefined;

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(where);

    const rows = await this.db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        actorId: auditLogs.actorId,
        actorName: actorAlias.fullName,
        actorEmail: actorAlias.email,
        payload: auditLogs.payload,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(actorAlias, eq(auditLogs.actorId, actorAlias.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return { rows, total: Number(totalRow.count) };
  }

  async findAllForExport(f: AuditLogFilters) {
    const conds = this.buildConditions(f);
    const where = conds.length > 0 ? and(...conds) : undefined;

    return this.db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        actorName: actorAlias.fullName,
        actorEmail: actorAlias.email,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(actorAlias, eq(auditLogs.actorId, actorAlias.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt));
  }

  async getDistinctActions() {
    const rows = await this.db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action);
    return rows.map((r) => r.action);
  }
}
