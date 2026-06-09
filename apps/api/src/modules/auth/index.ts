import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { AccountLockedError, ForbiddenError, UnauthorizedError } from '../../shared/errors';
import { dbPlugin } from '../../shared/plugins/db';
import { authModel } from './auth.model';
import { AuthService } from './auth.service';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(dbPlugin)
  .use(authModel)
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_ACCESS_SECRET!,
      exp: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as string,
    }),
  )
  .error({
    UNAUTHORIZED: UnauthorizedError,
    FORBIDDEN: ForbiddenError,
    ACCOUNT_LOCKED: AccountLockedError,
  })
  .onError(({ code, error, set }) => {
    set.headers['Cache-Control'] = 'no-store';

    if (code === 'UNAUTHORIZED') return { error: error.message };
    if (code === 'FORBIDDEN') return { error: error.message };
    if (code === 'ACCOUNT_LOCKED') {
      set.status = 429;
      set.headers['Retry-After'] = String(error.retryAfter);
      return { error: error.message, retryAfter: error.retryAfter };
    }
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: 'Validation failed', details: error.all };
    }

    set.status = 500;
    return { error: 'Internal server error' };
  })

  .post(
    '/login',
    async ({ body, db, jwt, request, set }) => {
      const service = new AuthService(db);
      const ipAddress = request.headers.get('x-forwarded-for') ?? undefined;
      const userAgent = request.headers.get('user-agent') ?? undefined;

      const result = await service.login({
        email: body.email,
        password: body.password,
        ipAddress,
        userAgent,
        signAccessToken: (payload) => jwt.sign(payload),
      });

      set.headers['Cache-Control'] = 'no-store';

      return {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.rawRefreshToken,
      };
    },
    {
      body: 'auth.login',
      response: 'auth.login.response',
    },
  )

  .post(
    '/refresh',
    async ({ body, db, jwt, request, set }) => {
      const service = new AuthService(db);
      const ipAddress = request.headers.get('x-forwarded-for') ?? undefined;
      const userAgent = request.headers.get('user-agent') ?? undefined;

      const result = await service.refresh({
        refreshToken: body.refreshToken,
        ipAddress,
        userAgent,
        signAccessToken: (payload) => jwt.sign(payload),
      });

      set.headers['Cache-Control'] = 'no-store';

      return {
        accessToken: result.accessToken,
        refreshToken: result.rawRefreshToken,
      };
    },
    {
      body: 'auth.refresh',
      response: 'auth.refresh.response',
    },
  )

  .post(
    '/logout',
    async ({ body, db, set }) => {
      const service = new AuthService(db);
      await service.logout(body?.refreshToken);
      set.headers['Cache-Control'] = 'no-store';
      return { ok: true as const };
    },
    {
      body: 'auth.logout',
      response: 'auth.logout.response',
    },
  );
