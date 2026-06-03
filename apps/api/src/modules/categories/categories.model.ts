import { Elysia, t } from 'elysia';

export const categoriesModel = new Elysia({ name: 'categories-model' }).model({
  'category.create': t.Object({
    name: t.String({ minLength: 2, maxLength: 100 }),
    code: t.Optional(t.String({ minLength: 2, maxLength: 20 })),
    description: t.Optional(t.String({ maxLength: 500 })),
    isActive: t.Optional(t.Boolean()),
  }),

  'category.update': t.Object({
    name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
    code: t.Optional(t.Nullable(t.String({ minLength: 2, maxLength: 20 }))),
    description: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
    isActive: t.Optional(t.Boolean()),
  }),

  'category.response': t.Object({
    id: t.String(),
    name: t.String(),
    code: t.Nullable(t.String()),
    description: t.Nullable(t.String()),
    isActive: t.Boolean(),
    createdAt: t.String(),
  }),

  'category.list.response': t.Array(
    t.Object({
      id: t.String(),
      name: t.String(),
      code: t.Nullable(t.String()),
      description: t.Nullable(t.String()),
      isActive: t.Boolean(),
    }),
  ),

  'category.ok.response': t.Object({
    ok: t.Literal(true),
  }),
});
