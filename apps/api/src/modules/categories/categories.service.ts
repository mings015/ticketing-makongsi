import type { Database } from '../../shared/database';
import { ConflictError, NotFoundError } from '../../shared/errors';
import { generateId } from '../../shared/utils/uuid';
import type { CurrentUser } from '../../shared/plugins/auth.plugin';
import { CategoriesRepository } from './categories.repository';

type CreateParams = { name: string; code?: string; description?: string; isActive?: boolean };
type UpdateParams = { name?: string; code?: string | null; description?: string | null; isActive?: boolean };

export class CategoriesService {
  private readonly repo: CategoriesRepository;

  constructor(db: Database) {
    this.repo = new CategoriesRepository(db);
  }

  async list(activeOnly = false) {
    return this.repo.findAll({ activeOnly });
  }

  async create(data: CreateParams, currentUser: CurrentUser) {
    const duplicate = await this.repo.findByName(data.name);
    if (duplicate) throw new ConflictError(`Category '${data.name}' already exists`);

    if (data.code) {
      const codeConflict = await this.repo.findByCode(data.code);
      if (codeConflict) throw new ConflictError(`Code '${data.code}' already in use`);
    }

    const created = await this.repo.create({
      id: generateId(),
      name: data.name,
      code: data.code ?? null,
      description: data.description,
      isActive: data.isActive ?? true,
    });

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'category.created',
      targetType: 'category',
      targetId: created.id,
    });

    return {
      id: created.id,
      name: created.name,
      code: created.code,
      description: created.description,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async update(id: string, data: UpdateParams, currentUser: CurrentUser) {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundError('Category', id);

    if (data.name && data.name !== category.name) {
      const duplicate = await this.repo.findByName(data.name);
      if (duplicate) throw new ConflictError(`Category '${data.name}' already exists`);
    }

    if (data.code && data.code !== category.code) {
      const codeConflict = await this.repo.findByCode(data.code);
      if (codeConflict) throw new ConflictError(`Code '${data.code}' already in use`);
    }

    const updated = await this.repo.update(id, data);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'category.updated',
      targetType: 'category',
      targetId: id,
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      description: updated.description,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async setActiveStatus(id: string, isActive: boolean, currentUser: CurrentUser) {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundError('Category', id);

    await this.repo.setActiveStatus(id, isActive);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: isActive ? 'category.activated' : 'category.deactivated',
      targetType: 'category',
      targetId: id,
    });

    return { ok: true as const };
  }

  async delete(id: string, currentUser: CurrentUser) {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundError('Category', id);

    await this.repo.softDelete(id);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'category.deleted',
      targetType: 'category',
      targetId: id,
    });

    return { ok: true as const };
  }
}
