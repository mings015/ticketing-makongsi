import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { dbPlugin } from '../../shared/plugins/db';
import { authPlugin } from '../../shared/plugins/auth.plugin';
import { AuditLogsService } from './audit-logs.service';

export const auditLogsRoutes = new Elysia({ prefix: '/audit-logs' })
  .use(dbPlugin)
  .use(jwt({ name: 'jwt', secret: process.env.JWT_ACCESS_SECRET! }))
  .use(authPlugin)
  .onError(({ code, set }) => {
    if (code === 'VALIDATION') { set.status = 400; return { error: 'Validation failed' }; }
    set.status = 500; return { error: 'Internal server error' };
  })

  .get('/', async ({ db, query }) => new AuditLogsService(db).list(query),
    { requireAuth: true, requirePermission: ['reports', 'read'] })

  .get('/actions', async ({ db }) => new AuditLogsService(db).getDistinctActions(),
    { requireAuth: true, requirePermission: ['reports', 'read'] })

  .get('/export', async ({ db, query, set }) => {
    const buffer = await new AuditLogsService(db).exportExcel(query);
    set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    set.headers['Content-Disposition'] = 'attachment; filename="audit-log.xlsx"';
    return buffer;
  }, { requireAuth: true, requirePermission: ['reports', 'read'] });
