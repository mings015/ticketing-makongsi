import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors';
import { dbPlugin } from '../../shared/plugins/db';
import { authPlugin } from '../../shared/plugins/auth.plugin';
import { usersModel } from './users.model';
import { UsersService } from './users.service';

export const usersRoutes = new Elysia({ prefix: '/users' })
  .use(dbPlugin)
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_ACCESS_SECRET!,
    }),
  )
  .use(authPlugin)
  .use(usersModel)
  .error({
    NOT_FOUND: NotFoundError,
    CONFLICT: ConflictError,
    FORBIDDEN: ForbiddenError,
    BAD_REQUEST: BadRequestError,
  })
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') { set.status = 404; return { error: error.message }; }
    if (code === 'CONFLICT') { set.status = 409; return { error: error.message }; }
    if (code === 'FORBIDDEN') { set.status = 403; return { error: error.message }; }
    if (code === 'BAD_REQUEST') { set.status = 400; return { error: error.message }; }
    if (code === 'VALIDATION') { set.status = 400; return { error: 'Validation failed', details: error.all }; }
    set.status = 500;
    return { error: 'Internal server error' };
  })

  // GET /users/me — MUST be before /:id
  .get(
    '/me',
    async ({ db, currentUser }) => {
      const service = new UsersService(db);
      return service.getMe(currentUser);
    },
    { requireAuth: true },
  )

  .patch(
    '/me',
    async ({ db, body, currentUser }) => {
      const service = new UsersService(db);
      return service.updateMe(body, currentUser);
    },
    { body: 'user.update', response: 'user.update.response', requireAuth: true },
  )

  .get(
    '/',
    async ({ db, query }) => {
      const service = new UsersService(db);
      return service.list({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        search: query.search,
        role: query.role,
        isActive: query.isActive,
      });
    },
    { query: 'user.list.query', requireAuth: true, requirePermission: ['users', 'read'] },
  )

  .post(
    '/',
    async ({ db, body, currentUser, set }) => {
      const service = new UsersService(db);
      set.status = 201;
      return service.create(body, currentUser);
    },
    { body: 'user.create', response: 'user.create.response', requireAuth: true, requirePermission: ['users', 'create'] },
  )

  .get(
    '/:id',
    async ({ db, params, currentUser }) => {
      const service = new UsersService(db);
      return service.getById(params.id, currentUser);
    },
    { requireAuth: true, requirePermission: ['users', 'read'] },
  )

  .patch(
    '/:id',
    async ({ db, params, body, currentUser }) => {
      const service = new UsersService(db);
      return service.update(params.id, body, currentUser);
    },
    { body: 'user.update', response: 'user.update.response', requireAuth: true, requirePermission: ['users', 'update'] },
  )

  .patch(
    '/:id/activate',
    async ({ db, params, currentUser }) => {
      const service = new UsersService(db);
      return service.activate(params.id, currentUser);
    },
    { response: 'user.ok.response', requireAuth: true, requirePermission: ['users', 'update'] },
  )

  .patch(
    '/:id/deactivate',
    async ({ db, params, currentUser }) => {
      const service = new UsersService(db);
      return service.deactivate(params.id, currentUser);
    },
    { response: 'user.ok.response', requireAuth: true, requirePermission: ['users', 'update'] },
  )

  .delete(
    '/:id',
    async ({ db, params, currentUser }) => {
      const service = new UsersService(db);
      return service.delete(params.id, currentUser);
    },
    { response: 'user.ok.response', requireAuth: true, requirePermission: ['users', 'delete'] },
  )

  .post(
    '/:id/roles',
    async ({ db, params, body, currentUser }) => {
      const service = new UsersService(db);
      return service.assignRole(params.id, body.roleId, currentUser);
    },
    { body: 'user.role.assign', response: 'user.ok.response', requireAuth: true, requirePermission: ['roles', 'assign'] },
  )

  .delete(
    '/:id/roles/:roleId',
    async ({ db, params, currentUser }) => {
      const service = new UsersService(db);
      return service.removeRole(params.id, params.roleId, currentUser);
    },
    { response: 'user.ok.response', requireAuth: true, requirePermission: ['roles', 'assign'] },
  )

  // PATCH /users/me/password — user ubah password sendiri (MUST be before /:id/password)
  .patch(
    '/me/password',
    async ({ db, body, currentUser }) => {
      const service = new UsersService(db);
      return service.changeMyPassword(body.password, body.confirmPassword, currentUser);
    },
    { body: 'user.change.password', response: 'user.ok.response', requireAuth: true },
  )

  // PATCH /users/:id/password — admin ubah password user lain
  .patch(
    '/:id/password',
    async ({ db, params, body, currentUser }) => {
      const service = new UsersService(db);
      return service.changePassword(params.id, body.password, body.confirmPassword, currentUser);
    },
    { body: 'user.change.password', response: 'user.ok.response', requireAuth: true, requirePermission: ['users', 'update'] },
  );
