import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../shared/errors';
import { dbPlugin } from '../../shared/plugins/db';
import { authPlugin } from '../../shared/plugins/auth.plugin';
import { ticketsModel } from './tickets.model';
import { TicketsService } from './tickets.service';
import { CommentsService } from './comments.service';
import { AttachmentsService } from './attachments.service';

const errorsMap = {
  NOT_FOUND: NotFoundError,
  FORBIDDEN: ForbiddenError,
  BAD_REQUEST: BadRequestError,
  CONFLICT: ConflictError,
};

function makeErrorHandler() {
  return ({ code, error, set }: { code: string; error: Error; set: { status: number } }) => {
    if (code === 'NOT_FOUND') { set.status = 404; return { error: error.message }; }
    if (code === 'FORBIDDEN') { set.status = 403; return { error: error.message }; }
    if (code === 'BAD_REQUEST') { set.status = 400; return { error: error.message }; }
    if (code === 'CONFLICT') { set.status = 409; return { error: error.message }; }
    if (code === 'VALIDATION') { set.status = 400; return { error: 'Validation failed' }; }
    set.status = 500;
    return { error: 'Internal server error' };
  };
}

export const ticketsRoutes = new Elysia({ prefix: '/tickets' })
  .use(dbPlugin)
  .use(jwt({ name: 'jwt', secret: process.env.JWT_ACCESS_SECRET! }))
  .use(authPlugin)
  .use(ticketsModel)
  .error(errorsMap)
  .onError(makeErrorHandler())

  // ─── Ticket CRUD ─────────────────────────────────────────────────────────

  .get(
    '/',
    async ({ db, query, currentUser }) => {
      const service = new TicketsService(db);
      return service.list(query, currentUser);
    },
    {
      query: 'ticket.list.query',
      response: 'ticket.list.response',
      requireAuth: true,
      requirePermission: ['tickets', 'read'],
    },
  )

  .get(
    '/:id',
    async ({ db, params, currentUser }) => {
      const service = new TicketsService(db);
      return service.getById(params.id, currentUser);
    },
    {
      requireAuth: true,
      requirePermission: ['tickets', 'read'],
    },
  )

  .post(
    '/',
    async ({ db, body, currentUser, set }) => {
      const service = new TicketsService(db);
      set.status = 201;
      return service.create(body, currentUser);
    },
    {
      body: 'ticket.create',
      response: 'ticket.create.response',
      requireAuth: true,
      requirePermission: ['tickets', 'create'],
    },
  )

  .patch(
    '/:id',
    async ({ db, params, body, currentUser }) => {
      const service = new TicketsService(db);
      return service.update(params.id, body, currentUser);
    },
    {
      body: 'ticket.update',
      response: 'ticket.update.response',
      requireAuth: true,
      requirePermission: ['tickets', 'update'],
    },
  )

  .patch(
    '/:id/assign',
    async ({ db, params, body, currentUser }) => {
      const service = new TicketsService(db);
      const result = await service.assign(params.id, body.assigneeId, currentUser);
      return { ok: result.ok };
    },
    {
      body: 'ticket.assign',
      response: 'ticket.ok.response',
      requireAuth: true,
      requirePermission: ['tickets', 'assign'],
    },
  )

  .patch(
    '/:id/status',
    async ({ db, params, body, currentUser }) => {
      const service = new TicketsService(db);
      return service.updateStatus(params.id, body, currentUser);
    },
    {
      body: 'ticket.status',
      response: 'ticket.ok.response',
      requireAuth: true,
      requirePermission: ['tickets', 'update'],
    },
  )

  .delete(
    '/:id',
    async ({ db, params, currentUser }) => {
      const service = new TicketsService(db);
      return service.softDelete(params.id, currentUser);
    },
    {
      response: 'ticket.ok.response',
      requireAuth: true,
      requirePermission: ['tickets', 'delete'],
    },
  )

  // ─── Comments ─────────────────────────────────────────────────────────────

  .post(
    '/:id/comments',
    async ({ db, params, body, currentUser, set }) => {
      const service = new CommentsService(db);
      set.status = 201;
      return service.create(params.id, body, currentUser);
    },
    {
      body: 'comment.create',
      response: 'comment.response',
      requireAuth: true,
      requirePermission: ['tickets', 'read'],
    },
  )

  .patch(
    '/:id/comments/:commentId',
    async ({ db, params, body, currentUser }) => {
      const service = new CommentsService(db);
      return service.update(params.id, params.commentId, body.body, currentUser);
    },
    {
      body: 'comment.update',
      response: 'comment.response',
      requireAuth: true,
      requirePermission: ['tickets', 'read'],
    },
  )

  .delete(
    '/:id/comments/:commentId',
    async ({ db, params, currentUser }) => {
      const service = new CommentsService(db);
      return service.delete(params.id, params.commentId, currentUser);
    },
    {
      response: 'ticket.ok.response',
      requireAuth: true,
      requirePermission: ['tickets', 'read'],
    },
  )

  // ─── Attachments ──────────────────────────────────────────────────────────

  .post(
    '/:id/attachments',
    async ({ db, params, body, currentUser, set }) => {
      const service = new AttachmentsService(db);
      set.status = 201;
      return service.upload(params.id, body.file as File, currentUser);
    },
    {
      body: t.Object({ file: t.File() }),
      requireAuth: true,
      requirePermission: ['tickets', 'read'],
    },
  )

  .delete(
    '/:id/attachments/:attachmentId',
    async ({ db, params, currentUser }) => {
      const service = new AttachmentsService(db);
      return service.delete(params.id, params.attachmentId, currentUser);
    },
    {
      response: 'ticket.ok.response',
      requireAuth: true,
      requirePermission: ['tickets', 'read'],
    },
  );
