import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { ConflictError, NotFoundError } from '../../shared/errors';
import { dbPlugin } from '../../shared/plugins/db';
import { authPlugin } from '../../shared/plugins/auth.plugin';
import { categoriesModel } from './categories.model';
import { CategoriesService } from './categories.service';

export const categoriesRoutes = new Elysia({ prefix: '/categories' })
  .use(dbPlugin)
  .use(jwt({ name: 'jwt', secret: process.env.JWT_ACCESS_SECRET! }))
  .use(authPlugin)
  .use(categoriesModel)
  .error({ NOT_FOUND: NotFoundError, CONFLICT: ConflictError })
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') { set.status = 404; return { error: error.message }; }
    if (code === 'CONFLICT') { set.status = 409; return { error: error.message }; }
    if (code === 'VALIDATION') { set.status = 400; return { error: 'Validation failed' }; }
    set.status = 500;
    return { error: 'Internal server error' };
  })

  .get(
    '/',
    async ({ db, query }) => {
      const service = new CategoriesService(db);
      const activeOnly = query.activeOnly === 'true';
      return service.list(activeOnly);
    },
    {
      query: t.Object({ activeOnly: t.Optional(t.String()) }),
      response: 'category.list.response',
      requireAuth: true,
    },
  )

  .post(
    '/',
    async ({ db, body, currentUser, set }) => {
      const service = new CategoriesService(db);
      set.status = 201;
      return service.create(body, currentUser);
    },
    {
      body: 'category.create',
      response: 'category.response',
      requireAuth: true,
      requirePermission: ['tickets', 'delete'],
    },
  )

  .patch(
    '/:id',
    async ({ db, params, body, currentUser }) => {
      const service = new CategoriesService(db);
      return service.update(params.id, body, currentUser);
    },
    {
      body: 'category.update',
      response: 'category.response',
      requireAuth: true,
      requirePermission: ['tickets', 'delete'],
    },
  )

  .patch(
    '/:id/activate',
    async ({ db, params, currentUser }) => {
      const service = new CategoriesService(db);
      return service.setActiveStatus(params.id, true, currentUser);
    },
    {
      response: 'category.ok.response',
      requireAuth: true,
      requirePermission: ['tickets', 'delete'],
    },
  )

  .patch(
    '/:id/deactivate',
    async ({ db, params, currentUser }) => {
      const service = new CategoriesService(db);
      return service.setActiveStatus(params.id, false, currentUser);
    },
    {
      response: 'category.ok.response',
      requireAuth: true,
      requirePermission: ['tickets', 'delete'],
    },
  )

  .delete(
    '/:id',
    async ({ db, params, currentUser }) => {
      const service = new CategoriesService(db);
      return service.delete(params.id, currentUser);
    },
    {
      response: 'category.ok.response',
      requireAuth: true,
      requirePermission: ['tickets', 'delete'],
    },
  );
