import { Elysia } from 'elysia';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { ForbiddenError, UnauthorizedError } from '../errors';
import { permissions, rolePermissions, roles, userRoles, users } from '../database/schema';
import { dbPlugin } from './db';

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
};

export const authPlugin = new Elysia({ name: 'auth-plugin' })
  .use(dbPlugin)
  .error({ UNAUTHORIZED: UnauthorizedError, FORBIDDEN: ForbiddenError })
  .onError(({ code, error, set }) => {
    if (code === 'UNAUTHORIZED') { set.status = 401; return { error: error.message }; }
    if (code === 'FORBIDDEN')    { set.status = 403; return { error: error.message }; }
  })
  .macro({
    requireAuth: (enabled: boolean) => ({
      async resolve({ request, db, jwt }: {
        request: Request;
        db: typeof import('../database').db;
        jwt: { verify: (token: string) => Promise<Record<string, unknown> | false> };
      }) {
        if (!enabled) return;

        const authHeader = request.headers.get('authorization') ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) throw new UnauthorizedError();

        const payload = await jwt.verify(token);
        if (!payload || typeof payload.sub !== 'string') throw new UnauthorizedError();

        const user = await db.query.users.findFirst({
          where: and(eq(users.id, payload.sub), isNull(users.deletedAt)),
          columns: { id: true, email: true, fullName: true, isActive: true },
        });

        if (!user) throw new UnauthorizedError();
        if (!user.isActive) throw new ForbiddenError('Account is inactive');

        const roleRows = await db
          .select({ name: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id));

        const currentUser: CurrentUser = {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          roles: roleRows.map((r) => r.name),
        };

        return { currentUser };
      },
    }),

    // Usage: requirePermission: ['users', 'read']
    requirePermission: (args: [string, string]) => ({
      async resolve({ currentUser, db }: {
        currentUser: CurrentUser;
        db: typeof import('../database').db;
      }) {
        if (!currentUser) throw new UnauthorizedError();

        const [resource, action] = args;

        const roleRows = await db
          .select({ roleId: userRoles.roleId })
          .from(userRoles)
          .where(eq(userRoles.userId, currentUser.id));

        const roleIds = roleRows.map((r) => r.roleId);
        if (roleIds.length === 0) throw new ForbiddenError();

        const [hasPermission] = await db
          .select({ id: rolePermissions.id })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(
            and(
              inArray(rolePermissions.roleId, roleIds),
              eq(permissions.resource, resource),
              eq(permissions.action, action),
            ),
          )
          .limit(1);

        if (!hasPermission) throw new ForbiddenError('Insufficient permissions');
      },
    }),
  });
