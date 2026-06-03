import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../shared/database';
import { auditLogs, categories } from '../../shared/database/schema';
import type { NewAuditLog, NewCategory } from '../../shared/database/schema';

type FindAllOptions = {
  activeOnly?: boolean;
};

export class CategoriesRepository {
  constructor(private readonly db: Database) {}

  async findAll(options: FindAllOptions = {}) {
    const conditions = [isNull(categories.deletedAt)];
    if (options.activeOnly) {
      conditions.push(eq(categories.isActive, true));
    }

    return this.db
      .select({
        id: categories.id,
        name: categories.name,
        code: categories.code,
        description: categories.description,
        isActive: categories.isActive,
      })
      .from(categories)
      .where(and(...conditions))
      .orderBy(categories.name);
  }

  async findById(id: string) {
    return this.db.query.categories.findFirst({
      where: and(eq(categories.id, id), isNull(categories.deletedAt)),
    });
  }

  async findByName(name: string) {
    return this.db.query.categories.findFirst({
      where: and(eq(categories.name, name), isNull(categories.deletedAt)),
    });
  }

  async findByCode(code: string) {
    return this.db.query.categories.findFirst({
      where: and(eq(categories.code, code), isNull(categories.deletedAt)),
    });
  }

  async create(data: NewCategory) {
    const [created] = await this.db
      .insert(categories)
      .values(data)
      .returning({
        id: categories.id,
        name: categories.name,
        code: categories.code,
        description: categories.description,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
      });
    return created;
  }

  async update(id: string, data: {
    name?: string;
    code?: string | null;
    description?: string | null;
    isActive?: boolean;
  }) {
    const [updated] = await this.db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .returning({
        id: categories.id,
        name: categories.name,
        code: categories.code,
        description: categories.description,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
      });
    return updated;
  }

  async setActiveStatus(id: string, isActive: boolean) {
    await this.db
      .update(categories)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)));
  }

  async softDelete(id: string) {
    await this.db
      .update(categories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(categories.id, id));
  }

  async createAuditLog(data: NewAuditLog) {
    await this.db.insert(auditLogs).values(data);
  }
}
