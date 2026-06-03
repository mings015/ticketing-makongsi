import ExcelJS from 'exceljs';
import type { Database } from '../../shared/database';
import { AuditLogsRepository, type AuditLogFilters } from './audit-logs.repository';

type QueryParams = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  action?: string;
  actorId?: string;
  targetType?: string;
  search?: string;
};

export class AuditLogsService {
  private readonly repo: AuditLogsRepository;

  constructor(db: Database) {
    this.repo = new AuditLogsRepository(db);
  }

  async list(query: QueryParams) {
    const page  = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));

    const filters: AuditLogFilters = {
      dateFrom:   query.dateFrom   ? new Date(query.dateFrom)   : undefined,
      dateTo:     query.dateTo     ? new Date(query.dateTo)     : undefined,
      action:     query.action,
      actorId:    query.actorId,
      targetType: query.targetType,
      search:     query.search,
    };

    const { rows, total } = await this.repo.findAll(filters, page, limit);

    return {
      data: rows.map((r) => ({
        id: r.id,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        actor: r.actorId
          ? { id: r.actorId, fullName: r.actorName ?? 'Unknown', email: r.actorEmail ?? '' }
          : null,
        payload: r.payload,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDistinctActions() {
    return this.repo.getDistinctActions();
  }

  async exportExcel(query: QueryParams): Promise<Buffer> {
    const filters: AuditLogFilters = {
      dateFrom:   query.dateFrom   ? new Date(query.dateFrom)   : undefined,
      dateTo:     query.dateTo     ? new Date(query.dateTo)     : undefined,
      action:     query.action,
      actorId:    query.actorId,
      targetType: query.targetType,
      search:     query.search,
    };

    const rows = await this.repo.findAllForExport(filters);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'IT Ticketing System';
    const ws = wb.addWorksheet('Audit Log');

    ws.columns = [
      { header: 'Timestamp',   key: 'createdAt',   width: 22 },
      { header: 'Action',      key: 'action',      width: 30 },
      { header: 'Module',      key: 'targetType',  width: 16 },
      { header: 'Target ID',   key: 'targetId',    width: 38 },
      { header: 'Actor',       key: 'actor',       width: 28 },
      { header: 'Email',       key: 'email',       width: 30 },
      { header: 'IP Address',  key: 'ipAddress',   width: 18 },
    ];

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    header.height = 20;

    for (const r of rows) {
      ws.addRow({
        createdAt: r.createdAt.toISOString().slice(0, 19).replace('T', ' '),
        action: r.action,
        targetType: r.targetType ?? '—',
        targetId: r.targetId ?? '—',
        actor: r.actorName ?? 'System',
        email: r.actorEmail ?? '—',
        ipAddress: r.ipAddress ?? '—',
      });
    }

    return wb.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
