import { Elysia, t } from 'elysia';

export const authModel = new Elysia({ name: 'auth-model' }).model({
  'auth.login': t.Object({
    email: t.String({ format: 'email', error: 'Invalid email address' }),
    password: t.String({ minLength: 8, error: 'Password must be at least 8 characters' }),
  }),

  'auth.login.response': t.Object({
    user: t.Object({
      id: t.String(),
      email: t.String(),
      fullName: t.String(),
      roles: t.Array(t.String()),
    }),
    accessToken: t.String(),
    refreshToken: t.String(),
  }),

  'auth.refresh': t.Object({
    refreshToken: t.String(),
  }),

  'auth.refresh.response': t.Object({
    accessToken: t.String(),
    refreshToken: t.String(),
  }),

  'auth.logout': t.Object({
    refreshToken: t.Optional(t.String()),
  }),

  'auth.logout.response': t.Object({
    ok: t.Literal(true),
  }),
});
