import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { dbPlugin } from '../../shared/plugins/db';
import { authPlugin } from '../../shared/plugins/auth.plugin';
import { DashboardService } from './dashboard.service';

export const dashboardRoutes = new Elysia({ prefix: '/dashboard' })
  .use(dbPlugin)
  .use(jwt({ name: 'jwt', secret: process.env.JWT_ACCESS_SECRET! }))
  .use(authPlugin)
  .onError(({ code, set }) => {
    if (code === 'VALIDATION') { set.status = 400; return { error: 'Validation failed' }; }
    set.status = 500;
    return { error: 'Internal server error' };
  })

  .get(
    '/',
    async ({ db, query, currentUser }) => {
      const service = new DashboardService(db);
      return service.getStats(query, currentUser);
    },
    {
      requireAuth: true,
      requirePermission: ['tickets', 'read'],
    },
  );
