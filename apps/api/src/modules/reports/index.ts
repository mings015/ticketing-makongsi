import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { dbPlugin } from '../../shared/plugins/db';
import { authPlugin } from '../../shared/plugins/auth.plugin';
import { ReportsService } from './reports.service';

export const reportsRoutes = new Elysia({ prefix: '/reports' })
  .use(dbPlugin)
  .use(jwt({ name: 'jwt', secret: process.env.JWT_ACCESS_SECRET! }))
  .use(authPlugin)
  .onError(({ code, set }) => {
    if (code === 'VALIDATION') { set.status = 400; return { error: 'Validation failed' }; }
    set.status = 500; return { error: 'Internal server error' };
  })

  .get('/tickets',       async ({ db, query }) => new ReportsService(db).getTicketStats(query),
    { requireAuth: true, requirePermission: ['reports', 'read'] })

  .get('/sla',           async ({ db, query }) => new ReportsService(db).getSlaStats(query),
    { requireAuth: true, requirePermission: ['reports', 'read'] })

  .get('/staff',         async ({ db, query }) => new ReportsService(db).getStaffStats(query),
    { requireAuth: true, requirePermission: ['reports', 'read'] })

  .get('/trends',        async ({ db, query }) => new ReportsService(db).getTrends(query),
    { requireAuth: true, requirePermission: ['reports', 'read'] })

  .get('/tickets/export', async ({ db, query, set }) => {
    const buffer = await new ReportsService(db).exportTicketsExcel(query);
    set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    set.headers['Content-Disposition'] = 'attachment; filename="tickets-report.xlsx"';
    return buffer;
  }, { requireAuth: true, requirePermission: ['reports', 'read'] })

  .get('/sla/export', async ({ db, query, set }) => {
    const buffer = await new ReportsService(db).exportSlaExcel(query);
    set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    set.headers['Content-Disposition'] = 'attachment; filename="sla-report.xlsx"';
    return buffer;
  }, { requireAuth: true, requirePermission: ['reports', 'read'] })

  .get('/staff/export', async ({ db, query, set }) => {
    const buffer = await new ReportsService(db).exportStaffExcel(query);
    set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    set.headers['Content-Disposition'] = 'attachment; filename="staff-performance.xlsx"';
    return buffer;
  }, { requireAuth: true, requirePermission: ['reports', 'read'] });
