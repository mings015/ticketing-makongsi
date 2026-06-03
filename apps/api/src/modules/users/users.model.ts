import { Elysia, t } from 'elysia';

const UserSummary = t.Object({
  id: t.String(),
  email: t.String(),
  fullName: t.String(),
  isActive: t.Boolean(),
  roles: t.Array(t.String()),
  createdAt: t.String(),
});

const PaginationMeta = t.Object({
  page: t.Number(),
  limit: t.Number(),
  total: t.Number(),
  totalPages: t.Number(),
});

export const usersModel = new Elysia({ name: 'users-model' }).model({
  'user.list.query': t.Object({
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    search: t.Optional(t.String()),
    role: t.Optional(t.String()),
    isActive: t.Optional(t.BooleanString()),
  }),

  'user.list.response': t.Object({
    data: t.Array(UserSummary),
    meta: PaginationMeta,
  }),

  'user.detail.response': t.Object({
    id: t.String(),
    email: t.String(),
    fullName: t.String(),
    isActive: t.Boolean(),
    roles: t.Array(t.String()),
    failedLoginAttempts: t.Nullable(t.Number()),
    lockedUntil: t.Nullable(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),

  'user.create': t.Object({
    fullName: t.String({ minLength: 2, maxLength: 255 }),
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8, error: 'Password minimal 8 karakter' }),
    roles: t.Array(t.String(), { minItems: 1 }),
  }),

  'user.create.response': t.Object({
    id: t.String(),
    email: t.String(),
    fullName: t.String(),
    roles: t.Array(t.String()),
    createdAt: t.String(),
  }),

  'user.change.password': t.Object({
    password: t.String({ minLength: 8, error: 'Password minimal 8 karakter' }),
    confirmPassword: t.String({ minLength: 8 }),
  }),

  'user.update': t.Object({
    fullName: t.Optional(t.String({ minLength: 2, maxLength: 255 })),
    email: t.Optional(t.String({ format: 'email' })),
  }),

  'user.update.response': t.Object({
    id: t.String(),
    email: t.String(),
    fullName: t.String(),
    updatedAt: t.String(),
  }),

  'user.role.assign': t.Object({
    roleId: t.String(),
  }),

  'user.ok.response': t.Object({
    ok: t.Literal(true),
  }),
});
