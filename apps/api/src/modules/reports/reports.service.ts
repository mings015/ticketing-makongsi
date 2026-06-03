import ExcelJS from 'exceljs';
import type { Database } from '../../shared/database';
import type { CurrentUser } from '../../shared/plugins/auth.plugin';
import type { TicketPriority, TicketStatus } from '../../shared/database/schema';
import { ReportsRepository, type ReportFilters } from './reports.repository';

type QueryParams = {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  priority?: string;
  status?: string;
  assigneeId?: string;
  period?: string;
};

function buildFilters(q: QueryParams): ReportFilters {
  return {
    dateFrom: q.dateFrom ? new Date(q.dateFrom) : undefined,
    dateTo:   q.dateTo   ? new Date(q.dateTo)   : undefined,
    categoryId: q.categoryId,
    priority: q.priority as TicketPriority | undefined,
    status:   q.status   as TicketStatus   | undefined,
    assigneeId: q.assigneeId,
  };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5BDB' } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.height = 20;
}

export class ReportsService {
  private readonly repo: ReportsRepository;

  constructor(db: Database) {
    this.repo = new ReportsRepository(db);
  }

  async getTicketStats(query: QueryParams) {
    const rows = await this.repo.getTicketRows(buildFilters(query));
    const summary = { total: rows.length, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
    for (const r of rows) {
      if (r.status in summary) summary[r.status as keyof typeof summary]++;
    }
    return { summary, rows: rows.slice(0, 100) };
  }

  async getSlaStats(query: QueryParams) {
    const rows = await this.repo.getSlaRows(buildFilters(query));
    const met = rows.filter((r) => r.slaStatus === 'met').length;
    const breached = rows.filter((r) => r.slaStatus === 'breached').length;
    const total = met + breached;
    return {
      summary: { met, breached, percentage: total > 0 ? Math.round((met / total) * 100) : 100 },
      rows: rows.slice(0, 100),
    };
  }

  async getStaffStats(query: QueryParams) {
    return this.repo.getStaffRows(buildFilters(query));
  }

  async getTrends(query: QueryParams) {
    const period = (query.period as 'daily' | 'weekly' | 'monthly') ?? 'daily';
    return this.repo.getTrends(buildFilters(query), period);
  }

  // ── Excel exports ──────────────────────────────────────────────────────

  async exportTicketsExcel(query: QueryParams): Promise<Buffer> {
    const rows = await this.repo.getTicketRows(buildFilters(query));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'IT Ticketing System';
    const ws = wb.addWorksheet('Tickets');

    ws.columns = [
      { header: 'Ticket Number', key: 'ticketNumber', width: 22 },
      { header: 'Title',         key: 'title',        width: 45 },
      { header: 'Status',        key: 'status',       width: 14 },
      { header: 'Priority',      key: 'priority',     width: 12 },
      { header: 'Category',      key: 'category',     width: 20 },
      { header: 'Requester',     key: 'requester',    width: 25 },
      { header: 'Assignee',      key: 'assignee',     width: 25 },
      { header: 'Created At',    key: 'createdAt',    width: 20 },
      { header: 'Closed At',     key: 'closedAt',     width: 20 },
    ];

    styleHeaderRow(ws.getRow(1));

    for (const r of rows) {
      ws.addRow({
        ticketNumber: r.ticketNumber,
        title: r.title,
        status: r.status,
        priority: r.priority,
        category: r.categoryName ?? '—',
        requester: r.requesterName ?? '—',
        assignee: r.assigneeName ?? '—',
        createdAt: r.createdAt.toISOString().slice(0, 19).replace('T', ' '),
        closedAt: r.closedAt ? r.closedAt.toISOString().slice(0, 19).replace('T', ' ') : '—',
      });
    }

    return wb.xlsx.writeBuffer() as Promise<Buffer>;
  }

  async exportSlaExcel(query: QueryParams): Promise<Buffer> {
    const rows = await this.repo.getSlaRows(buildFilters(query));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('SLA Report');

    ws.columns = [
      { header: 'Ticket Number',     key: 'ticketNumber',    width: 22 },
      { header: 'Title',             key: 'title',           width: 40 },
      { header: 'Priority',          key: 'priority',        width: 12 },
      { header: 'Status',            key: 'status',          width: 14 },
      { header: 'SLA Target (hours)', key: 'slaTarget',      width: 20 },
      { header: 'SLA Actual (hours)', key: 'slaActual',      width: 20 },
      { header: 'SLA Status',        key: 'slaStatus',       width: 14 },
      { header: 'Created At',        key: 'createdAt',       width: 20 },
    ];

    styleHeaderRow(ws.getRow(1));

    for (const r of rows) {
      const row = ws.addRow({
        ticketNumber: r.ticketNumber,
        title: r.title,
        priority: r.priority,
        status: r.status,
        slaTarget: r.slaTargetHours,
        slaActual: r.slaActualHours ?? '—',
        slaStatus: r.slaStatus,
        createdAt: r.createdAt.toISOString().slice(0, 19).replace('T', ' '),
      });
      const cell = row.getCell('slaStatus');
      if (r.slaStatus === 'met') {
        cell.font = { color: { argb: 'FF16A34A' }, bold: true };
      } else if (r.slaStatus === 'breached') {
        cell.font = { color: { argb: 'FFDC2626' }, bold: true };
      }
    }

    return wb.xlsx.writeBuffer() as Promise<Buffer>;
  }

  async exportStaffExcel(query: QueryParams): Promise<Buffer> {
    const rows = await this.repo.getStaffRows(buildFilters(query));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Staff Performance');

    ws.columns = [
      { header: 'Staff Name',         key: 'fullName',       width: 28 },
      { header: 'Assigned',           key: 'assigned',       width: 14 },
      { header: 'Resolved',           key: 'resolved',       width: 14 },
      { header: 'Avg Resolution (h)', key: 'avgResolution',  width: 22 },
      { header: 'SLA Met',            key: 'slaMet',         width: 12 },
      { header: 'SLA Breached',       key: 'slaBreached',    width: 14 },
      { header: 'SLA Rate (%)',        key: 'slaRate',        width: 14 },
    ];

    styleHeaderRow(ws.getRow(1));

    for (const r of rows) {
      ws.addRow({
        fullName: r.fullName,
        assigned: r.assigned,
        resolved: r.resolved,
        avgResolution: r.avgResolutionHours ?? '—',
        slaMet: r.slaMet,
        slaBreached: r.slaBreached,
        slaRate: r.slaRate !== null ? `${r.slaRate}%` : '—',
      });
    }

    return wb.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
