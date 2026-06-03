import { and, asc, count, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '../../shared/database';
import {
  auditLogs,
  categories,
  tickets,
  users,
} from '../../shared/database/schema';
import type { TicketPriority, TicketStatus } from '../../shared/database/schema';

const SLA_TARGETS_MS: Record<TicketPriority, number> = {
  critical: 4  * 60 * 60 * 1000,
  high:     8  * 60 * 60 * 1000,
  medium:   24 * 60 * 60 * 1000,
  low:      72 * 60 * 60 * 1000,
};

const actorAlias = alias(users, 'actor');

export type DashboardFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  categoryId?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  forceRequesterId?: string;
  showUnassignedOrMine?: boolean;
  currentUserId?: string;
};

export class DashboardRepository {
  constructor(private readonly db: Database) {}

  private buildBaseConditions(filters: DashboardFilters) {
    const conditions = [isNull(tickets.deletedAt)];

    if (filters.forceRequesterId) {
      conditions.push(eq(tickets.requesterId, filters.forceRequesterId));
    }
    if (filters.showUnassignedOrMine && filters.currentUserId) {
      conditions.push(
        or(isNull(tickets.assigneeId), eq(tickets.assigneeId, filters.currentUserId))!,
      );
    }
    if (filters.dateFrom) {
      conditions.push(gte(tickets.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(tickets.createdAt, filters.dateTo));
    }
    if (filters.categoryId) {
      conditions.push(eq(tickets.categoryId, filters.categoryId));
    }
    if (filters.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }
    if (filters.status) {
      conditions.push(eq(tickets.status, filters.status));
    }

    return conditions;
  }

  async getTicketSummary(filters: DashboardFilters) {
    const conditions = this.buildBaseConditions(filters);
    const rows = await this.db
      .select({ status: tickets.status, count: count() })
      .from(tickets)
      .where(and(...conditions))
      .groupBy(tickets.status);

    const summary = { total: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
    for (const row of rows) {
      const n = Number(row.count);
      summary.total += n;
      summary[row.status as keyof typeof summary] = n;
    }
    return summary;
  }

  async getMyAssignedTickets(userId: string) {
    const now = new Date();

    const rows = await this.db
      .select({
        id: tickets.id,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .where(
        and(
          isNull(tickets.deletedAt),
          eq(tickets.assigneeId, userId),
          or(
            eq(tickets.status, 'open'),
            eq(tickets.status, 'in_progress'),
            eq(tickets.status, 'pending'),
          ),
        ),
      );

    let assigned = 0;
    let in_progress = 0;
    let overdue = 0;

    for (const t of rows) {
      assigned++;
      if (t.status === 'in_progress') in_progress++;

      const slaTarget = SLA_TARGETS_MS[t.priority as TicketPriority];
      const deadline = new Date(t.createdAt.getTime() + slaTarget);
      if (now > deadline) overdue++;
    }

    return { assigned, in_progress, overdue };
  }

  async getByPriority(filters: DashboardFilters) {
    const conditions = this.buildBaseConditions(filters);
    const rows = await this.db
      .select({ priority: tickets.priority, count: count() })
      .from(tickets)
      .where(and(...conditions))
      .groupBy(tickets.priority);

    const result = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const row of rows) {
      result[row.priority as TicketPriority] = Number(row.count);
    }
    return result;
  }

  async getByCategory(filters: DashboardFilters) {
    const conditions = this.buildBaseConditions(filters);
    return this.db
      .select({
        id: categories.id,
        name: categories.name,
        count: count(tickets.id),
      })
      .from(tickets)
      .leftJoin(
        categories,
        and(eq(tickets.categoryId, categories.id), isNull(categories.deletedAt)),
      )
      .where(and(...conditions))
      .groupBy(categories.id, categories.name)
      .orderBy(desc(count(tickets.id)));
  }

  async getSlaStats(filters: DashboardFilters) {
    const conditions = this.buildBaseConditions(filters);
    const rows = await this.db
      .select({
        priority: tickets.priority,
        status: tickets.status,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
      })
      .from(tickets)
      .where(and(...conditions));

    const now = new Date();
    let met = 0;
    let breached = 0;

    for (const t of rows) {
      const slaTarget = SLA_TARGETS_MS[t.priority as TicketPriority];
      const deadline = new Date(t.createdAt.getTime() + slaTarget);
      const completedAt = t.resolvedAt ?? t.closedAt;

      const isDone = t.status === 'resolved' || t.status === 'closed';

      if (isDone && completedAt) {
        if (completedAt <= deadline) met++;
        else breached++;
      } else if (!isDone) {
        if (now > deadline) breached++;
        // else still within SLA window, not counted
      }
    }

    const total = met + breached;
    const percentage = total > 0 ? Math.round((met / total) * 100) : 100;
    return { met, breached, percentage };
  }

  async getRecentActivities(limit = 10) {
    const rows = await this.db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        actorName: actorAlias.fullName,
        payload: auditLogs.payload,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(actorAlias, eq(auditLogs.actorId, actorAlias.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      actorName: r.actorName ?? 'System',
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getTeamPerformance(filters: DashboardFilters) {
    const conditions = [
      isNull(tickets.deletedAt),
      or(eq(tickets.status, 'resolved'), eq(tickets.status, 'closed'))!,
    ];
    if (filters.dateFrom) conditions.push(gte(tickets.createdAt, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(tickets.createdAt, filters.dateTo));

    const rows = await this.db
      .select({
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
      })
      .from(tickets)
      .where(and(...conditions));

    const completed = rows.length;
    let totalResolutionMs = 0;
    let countWithResolution = 0;

    for (const t of rows) {
      const completedAt = t.resolvedAt ?? t.closedAt;
      if (completedAt) {
        totalResolutionMs += completedAt.getTime() - t.createdAt.getTime();
        countWithResolution++;
      }
    }

    const avgResolutionTimeHours =
      countWithResolution > 0
        ? Math.round((totalResolutionMs / countWithResolution / 3600000) * 10) / 10
        : 0;

    return { completed, avgResolutionTimeHours };
  }
}
