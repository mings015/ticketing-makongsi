import type { Database } from '../../shared/database';
import type { CurrentUser } from '../../shared/plugins/auth.plugin';
import type { TicketPriority, TicketStatus } from '../../shared/database/schema';
import { DashboardRepository, type DashboardFilters } from './dashboard.repository';

type QueryParams = {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  priority?: string;
  status?: string;
};

export class DashboardService {
  private readonly repo: DashboardRepository;

  constructor(db: Database) {
    this.repo = new DashboardRepository(db);
  }

  async getStats(query: QueryParams, currentUser: CurrentUser) {
    const isEmployee = currentUser.roles.includes('employee') &&
      !currentUser.roles.some((r) => ['support', 'admin', 'super_admin'].includes(r));
    const isSupport = currentUser.roles.includes('support') &&
      !currentUser.roles.some((r) => ['admin', 'super_admin'].includes(r));

    const filters: DashboardFilters = {
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      categoryId: query.categoryId,
      priority: query.priority as TicketPriority | undefined,
      status: query.status as TicketStatus | undefined,
      currentUserId: currentUser.id,
    };

    if (isEmployee) {
      filters.forceRequesterId = currentUser.id;
    } else if (isSupport) {
      filters.showUnassignedOrMine = true;
    }

    const [
      ticketSummary,
      byPriority,
      byCategory,
      slaMonitoring,
      recentActivities,
      teamPerformance,
    ] = await Promise.all([
      this.repo.getTicketSummary(filters),
      this.repo.getByPriority(filters),
      this.repo.getByCategory(filters),
      this.repo.getSlaStats(filters),
      this.repo.getRecentActivities(10),
      this.repo.getTeamPerformance(filters),
    ]);

    const myAssignedTickets = isSupport || currentUser.roles.some((r) =>
      ['admin', 'super_admin'].includes(r),
    )
      ? await this.repo.getMyAssignedTickets(currentUser.id)
      : null;

    return {
      ticketSummary,
      myAssignedTickets,
      byPriority,
      byCategory: byCategory.map((c) => ({
        id: c.id ?? null,
        name: c.name ?? 'Tanpa Kategori',
        count: Number(c.count),
      })),
      slaMonitoring,
      recentActivities,
      teamPerformance,
    };
  }
}
