import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { join } from 'node:path';
import { runMigrations } from './shared/database/migrate';
import { authRoutes } from './modules/auth';
import { usersRoutes } from './modules/users';
import { ticketsRoutes } from './modules/tickets';
import { categoriesRoutes } from './modules/categories';
import { dashboardRoutes } from './modules/dashboard';
import { reportsRoutes } from './modules/reports';
import { auditLogsRoutes } from './modules/audit-logs';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

const app = new Elysia()
  .use(
    cors({
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )
  .use(authRoutes)
  .use(usersRoutes)
  .use(ticketsRoutes)
  .use(categoriesRoutes)
  .use(dashboardRoutes)
  .use(reportsRoutes)
  .use(auditLogsRoutes)
  .get('/uploads/:filename', async ({ params, set }) => {
    const file = Bun.file(join(UPLOADS_DIR, params.filename));
    const exists = await file.exists();
    if (!exists) { set.status = 404; return { error: 'File not found' }; }
    return file;
  })
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .onStart(async () => {
    if (process.env.NODE_ENV !== 'production') {
      await runMigrations();
    }
  });

app.listen(Number(process.env.PORT ?? 3000));

console.log(`API running at http://localhost:${process.env.PORT ?? 3000}`);

export type App = typeof app;
