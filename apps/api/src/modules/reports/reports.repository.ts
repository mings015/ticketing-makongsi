import { and, count, desc, eq, gte, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '../../shared/database';
import { categories, tickets, users } from '../../shared/database/schema';
import type { TicketPriority, TicketStatus } from '../../shared/database/schema';

const SLA_TARGETS_MS: Record<TicketPriority, number> = {
  critical: 4  * 60 * 60 * 1000,
  high:     8  * 60 * 60 * 1000,
  medium:   24 * 60 * 60 * 1000,
  low:      72 * 60 * 60 * 1000,
};

const requesterAlias = alias(users, 'requester');
const assigneeAlias  = alias(users, 'assignee');

export type ReportFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  categoryId?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigneeId?: string;
};

export class ReportsRepository {
  constructor(private readonly db: Database) {}

  private baseConditions(f: ReportFilters) {
    const conds = [isNull(tickets.deletedAt)];
    if (f.dateFrom)    conds.push(gte(tickets.createdAt, f.dateFrom));
    if (f.dateTo)      conds.push(lte(tickets.createdAt, f.dateTo));
    if (f.categoryId)  conds.push(eq(tickets.categoryId, f.categoryId));
    if (f.priority)    conds.push(eq(tickets.priority, f.priority));
    if (f.status)      conds.push(eq(tickets.status, f.status));
    if (f.assigneeId)  conds.push(eq(tickets.assigneeId, f.assigneeId));
    return conds;
  }

  // ── Ticket report rows (for export + display) ──────────────────────────
  async getTicketRows(f: ReportFilters) {
    return this.db
      .select({
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
        categoryName: categories.name,
        requesterName: requesterAlias.fullName,
        assigneeName: assigneeAlias.fullName,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
      })
      .from(tickets)
      .leftJoin(categories, and(eq(tickets.categoryId, categories.id), isNull(categories.deletedAt)))
      .leftJoin(requesterAlias, eq(tickets.requesterId, requesterAlias.id))
      .leftJoin(assigneeAlias, eq(tickets.assigneeId, assigneeAlias.id))
      .where(and(...this.baseConditions(f)))
      .orderBy(desc(tickets.createdAt));
  }

  // ── SLA report rows ────────────────────────────────────────────────────
  async getSlaRows(f: ReportFilters) {
    const rows = await this.db
      .select({
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        priority: tickets.priority,
        status: tickets.status,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
      })
      .from(tickets)
      .where(and(...this.baseConditions(f)))
      .orderBy(desc(tickets.createdAt));

    const now = new Date();
    return rows.map((t) => {
      const targetMs = SLA_TARGETS_MS[t.priority as TicketPriority];
      const targetHours = targetMs / 3600000;
      const deadline = new Date(t.createdAt.getTime() + targetMs);
      const completedAt = t.resolvedAt ?? t.closedAt;
      const isDone = t.status === 'resolved' || t.status === 'closed';

      let slaStatus: 'met' | 'breached' | 'ongoing';
      let actualHours: number | null = null;

      if (isDone && completedAt) {
        actualHours = Math.round(((completedAt.getTime() - t.createdAt.getTime()) / 3600000) * 10) / 10;
        slaStatus = completedAt <= deadline ? 'met' : 'breached';
      } else {
        slaStatus = now > deadline ? 'breached' : 'ongoing';
      }

      return {
        ticketNumber: t.ticketNumber,
        title: t.title,
        priority: t.priority,
        status: t.status,
        slaTargetHours: targetHours,
        slaActualHours: actualHours,
        slaStatus,
        createdAt: t.createdAt,
      };
    });
  }

  // ── Staff performance ──────────────────────────────────────────────────
  async getStaffRows(f: ReportFilters) {
    const conds = [isNull(tickets.deletedAt), isNotNull(tickets.assigneeId)];
    if (f.dateFrom) conds.push(gte(tickets.createdAt, f.dateFrom));
    if (f.dateTo)   conds.push(lte(tickets.createdAt, f.dateTo));

    const rows = await this.db
      .select({
        assigneeId: tickets.assigneeId,
        fullName: assigneeAlias.fullName,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
      })
      .from(tickets)
      .leftJoin(assigneeAlias, eq(tickets.assigneeId, assigneeAlias.id))
      .where(and(...conds));

    const now = new Date();
    const staffMap = new Map<string, {
      fullName: string;
      assigned: number;
      resolved: number;
      totalResolutionMs: number;
      slamet: number;
      slaBreached: number;
    }>();

    for (const t of rows) {
      if (!t.assigneeId) continue;
      const entry = staffMap.get(t.assigneeId) ?? {
        fullName: t.fullName ?? '—',
        assigned: 0, resolved: 0,
        totalResolutionMs: 0,
        slamet: 0, slaBreached: 0,
      };
      entry.assigned++;

      const isDone = t.status === 'resolved' || t.status === 'closed';
      if (isDone) entry.resolved++;

      const targetMs = SLA_TARGETS_MS[t.priority as TicketPriority];
      const deadline = new Date(t.createdAt.getTime() + targetMs);
      const completedAt = t.resolvedAt ?? t.closedAt;

      if (isDone && completedAt) {
        entry.totalResolutionMs += completedAt.getTime() - t.createdAt.getTime();
        if (completedAt <= deadline) entry.slamet++;
        else entry.slaBreached++;
      } else if (!isDone && now > deadline) {
        entry.slaBreached++;
      }

      staffMap.set(t.assigneeId, entry);
    }

    return Array.from(staffMap.entries()).map(([id, s]) => ({
      assigneeId: id,
      fullName: s.fullName,
      assigned: s.assigned,
      resolved: s.resolved,
      avgResolutionHours: s.resolved > 0
        ? Math.round((s.totalResolutionMs / s.resolved / 3600000) * 10) / 10
        : null,
      slaMet: s.slamet,
      slaBreached: s.slaBreached,
      slaRate: s.slamet + s.slaBreached > 0
        ? Math.round((s.slamet / (s.slamet + s.slaBreached)) * 100)
        : null,
    })).sort((a, b) => b.resolved - a.resolved);
  }

  // ── Trends (daily/weekly/monthly) ──────────────────────────────────────
  async getTrends(f: ReportFilters, period: 'daily' | 'weekly' | 'monthly') {
    const truncExpr = period === 'daily'
      ? sql<string>`TO_CHAR(DATE_TRUNC('day', ${tickets.createdAt}), 'YYYY-MM-DD')`
      : period === 'weekly'
      ? sql<string>`TO_CHAR(DATE_TRUNC('week', ${tickets.createdAt}), 'YYYY-MM-DD')`
      : sql<string>`TO_CHAR(DATE_TRUNC('month', ${tickets.createdAt}), 'YYYY-MM')`;

    const conds = [isNull(tickets.deletedAt)];
    if (f.dateFrom) conds.push(gte(tickets.createdAt, f.dateFrom));
    if (f.dateTo)   conds.push(lte(tickets.createdAt, f.dateTo));

    const rows = await this.db
      .select({ period: truncExpr, count: count() })
      .from(tickets)
      .where(and(...conds))
      .groupBy(truncExpr)
      .orderBy(truncExpr);

    return rows.map((r) => ({ period: r.period, count: Number(r.count) }));
  }
}
