import { Elysia, t } from 'elysia';

const TicketSummary = t.Object({
  id: t.String(),
  ticketNumber: t.String(),
  title: t.String(),
  status: t.String(),
  priority: t.String(),
  category: t.Nullable(t.Object({ id: t.String(), name: t.String() })),
  requester: t.Object({ id: t.String(), fullName: t.String() }),
  assignee: t.Nullable(t.Object({ id: t.String(), fullName: t.String() })),
  createdAt: t.String(),
  updatedAt: t.String(),
});

const PaginationMeta = t.Object({
  page: t.Number(),
  limit: t.Number(),
  total: t.Number(),
  totalPages: t.Number(),
});

export const ticketsModel = new Elysia({ name: 'tickets-model' }).model({
  'ticket.list.query': t.Object({
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    search: t.Optional(t.String()),
    status: t.Optional(t.String()),
    priority: t.Optional(t.String()),
    categoryId: t.Optional(t.String()),
    assigneeId: t.Optional(t.String()),
    requesterId: t.Optional(t.String()),
  }),

  'ticket.list.response': t.Object({
    data: t.Array(TicketSummary),
    meta: PaginationMeta,
  }),

  'ticket.create': t.Object({
    title: t.String({ minLength: 5, maxLength: 255 }),
    description: t.String({ minLength: 10 }),
    priority: t.Optional(t.UnionEnum(['low', 'medium', 'high', 'critical'])),
    categoryId: t.Optional(t.String()),
    dueAt: t.Optional(t.String()),
  }),

  'ticket.create.response': t.Object({
    id: t.String(),
    ticketNumber: t.String(),
    title: t.String(),
    status: t.String(),
    priority: t.String(),
    createdAt: t.String(),
  }),

  'ticket.update': t.Object({
    title: t.Optional(t.String({ minLength: 5, maxLength: 255 })),
    description: t.Optional(t.String({ minLength: 10 })),
    priority: t.Optional(t.UnionEnum(['low', 'medium', 'high', 'critical'])),
    categoryId: t.Optional(t.Nullable(t.String())),
    dueAt: t.Optional(t.Nullable(t.String())),
  }),

  'ticket.update.response': t.Object({
    id: t.String(),
    title: t.String(),
    priority: t.String(),
    updatedAt: t.String(),
  }),

  'ticket.assign': t.Object({
    assigneeId: t.Nullable(t.String()),
  }),

  'ticket.status': t.Object({
    status: t.UnionEnum(['in_progress', 'pending', 'resolved', 'closed']),
    note: t.Optional(t.String({ maxLength: 1000 })),
  }),

  'ticket.ok.response': t.Object({
    ok: t.Literal(true),
  }),

  'comment.create': t.Object({
    body: t.String({ minLength: 1, maxLength: 5000 }),
    isInternal: t.Optional(t.Boolean()),
  }),

  'comment.update': t.Object({
    body: t.String({ minLength: 1, maxLength: 5000 }),
  }),

  'comment.response': t.Object({
    id: t.String(),
    body: t.String(),
    isInternal: t.Boolean(),
    author: t.Object({ id: t.String(), fullName: t.String() }),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
});
