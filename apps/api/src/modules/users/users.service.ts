import type { Database } from '../../shared/database';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors';
import { hashPassword } from '../../shared/utils/password';
import { generateId } from '../../shared/utils/uuid';
import type { CurrentUser } from '../../shared/plugins/auth.plugin';
import { UsersRepository } from './users.repository';

type ListParams = {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  isActive?: boolean;
};

type CreateParams = { fullName: string; email: string; password: string; roles: string[] };
type UpdateParams = { fullName?: string; email?: string };

export class UsersService {
  private readonly repo: UsersRepository;

  constructor(db: Database) {
    this.repo = new UsersRepository(db);
  }

  async list(params: ListParams) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const { data, total } = await this.repo.listUsers({ ...params, page, limit });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string, currentUser: CurrentUser) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User', id);

    const isSuperAdmin = currentUser.roles.includes('super_admin');

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      roles: user.roles,
      failedLoginAttempts: isSuperAdmin ? user.failedLoginAttempts : null,
      lockedUntil: isSuperAdmin ? (user.lockedUntil?.toISOString() ?? null) : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async create(data: CreateParams, currentUser: CurrentUser) {
    const duplicate = await this.repo.findByEmail(data.email);
    if (duplicate) throw new ConflictError('Email already in use');

    const passwordHash = await hashPassword(data.password);
    const userId = generateId();

    await this.repo.createUser({
      id: userId,
      email: data.email,
      fullName: data.fullName,
      passwordHash,
    });

    for (const roleName of data.roles) {
      const role = await this.repo.findRoleByName(roleName);
      if (role) {
        await this.repo.assignRole(userId, role.id, currentUser.id);
      }
    }

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'user.created',
      targetType: 'user',
      targetId: userId,
      payload: { email: data.email, roles: data.roles },
    });

    const created = await this.repo.findById(userId);
    return {
      id: created!.id,
      email: created!.email,
      fullName: created!.fullName,
      roles: created!.roles,
      createdAt: created!.createdAt.toISOString(),
    };
  }

  async update(id: string, data: UpdateParams, currentUser: CurrentUser) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User', id);

    if (data.email && data.email !== user.email) {
      const duplicate = await this.repo.findByEmail(data.email);
      if (duplicate) throw new ConflictError('Email already in use');
    }

    const updated = await this.repo.updateUser(id, data);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'user.updated',
      targetType: 'user',
      targetId: id,
      payload: data as Record<string, unknown>,
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async activate(id: string, currentUser: CurrentUser) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User', id);
    if (user.isActive) return { ok: true as const };

    await this.repo.setActiveStatus(id, true);
    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'user.activated',
      targetType: 'user',
      targetId: id,
    });
    return { ok: true as const };
  }

  async deactivate(id: string, currentUser: CurrentUser) {
    if (id === currentUser.id) {
      throw new BadRequestError('Cannot deactivate your own account');
    }

    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User', id);
    if (!user.isActive) return { ok: true as const };

    const isTargetSuperAdmin = await this.repo.isSuperAdmin(id);
    const isCurrentAdmin =
      currentUser.roles.includes('admin') && !currentUser.roles.includes('super_admin');
    if (isTargetSuperAdmin && isCurrentAdmin) {
      throw new ForbiddenError('Admin cannot deactivate a Super Admin');
    }

    await this.repo.setActiveStatus(id, false);
    await this.repo.revokeAllRefreshTokens(id);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'user.deactivated',
      targetType: 'user',
      targetId: id,
    });
    return { ok: true as const };
  }

  async delete(id: string, currentUser: CurrentUser) {
    if (id === currentUser.id) {
      throw new BadRequestError('Cannot delete your own account');
    }

    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User', id);

    const isTargetSuperAdmin = await this.repo.isSuperAdmin(id);
    if (isTargetSuperAdmin) {
      const superAdminCount = await this.repo.countSuperAdmins();
      if (superAdminCount <= 1) {
        throw new BadRequestError('Cannot delete the only Super Admin');
      }
      throw new ForbiddenError('Cannot delete a Super Admin account');
    }

    await this.repo.revokeAllRefreshTokens(id);
    await this.repo.softDeleteUser(id);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'user.deleted',
      targetType: 'user',
      targetId: id,
    });
    return { ok: true as const };
  }

  async assignRole(userId: string, roleId: string, currentUser: CurrentUser) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const role = await this.repo.findRoleById(roleId);
    if (!role) throw new NotFoundError('Role', roleId);

    await this.repo.assignRole(userId, roleId, currentUser.id);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'user.role_assigned',
      targetType: 'user',
      targetId: userId,
      payload: { roleId, roleName: role.name },
    });
    return { ok: true as const };
  }

  async removeRole(userId: string, roleId: string, currentUser: CurrentUser) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const roleCount = await this.repo.countUserRoles(userId);
    if (roleCount <= 1) {
      throw new BadRequestError('User must have at least one role');
    }

    await this.repo.removeRole(userId, roleId);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'user.role_removed',
      targetType: 'user',
      targetId: userId,
      payload: { roleId },
    });
    return { ok: true as const };
  }

  async getMe(currentUser: CurrentUser) {
    const user = await this.repo.findById(currentUser.id);
    if (!user) throw new NotFoundError('User');
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      roles: user.roles,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateMe(data: UpdateParams, currentUser: CurrentUser) {
    return this.update(currentUser.id, data, currentUser);
  }

  async changePassword(
    id: string,
    password: string,
    confirmPassword: string,
    currentUser: CurrentUser,
  ) {
    if (password !== confirmPassword) {
      throw new BadRequestError('Password dan konfirmasi password tidak sama');
    }

    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User', id);

    // Admin tidak boleh mengubah password Super Admin
    const isTargetSuperAdmin = await this.repo.isSuperAdmin(id);
    const isCurrentSuperAdmin = currentUser.roles.includes('super_admin');
    if (isTargetSuperAdmin && !isCurrentSuperAdmin) {
      throw new ForbiddenError('Tidak dapat mengubah password Super Admin');
    }

    const passwordHash = await hashPassword(password);
    await this.repo.updatePasswordHash(id, passwordHash);

    // Revoke semua sesi aktif setelah password berubah
    await this.repo.revokeAllRefreshTokens(id);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'user.password_changed',
      targetType: 'user',
      targetId: id,
    });

    return { ok: true as const };
  }

  async changeMyPassword(
    password: string,
    confirmPassword: string,
    currentUser: CurrentUser,
  ) {
    return this.changePassword(currentUser.id, password, confirmPassword, currentUser);
  }
}
