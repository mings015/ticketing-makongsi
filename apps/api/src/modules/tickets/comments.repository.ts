import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../shared/database';
import { comments } from '../../shared/database/schema';
import type { NewComment } from '../../shared/database/schema';

export class CommentsRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewComment) {
    const [comment] = await this.db
      .insert(comments)
      .values(data)
      .returning({
        id: comments.id,
        body: comments.body,
        isInternal: comments.isInternal,
        authorId: comments.authorId,
        ticketId: comments.ticketId,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      });
    return comment;
  }

  async findById(id: string) {
    return this.db.query.comments.findFirst({
      where: and(eq(comments.id, id), isNull(comments.deletedAt)),
    });
  }

  async update(id: string, body: string) {
    const [updated] = await this.db
      .update(comments)
      .set({ body, updatedAt: new Date() })
      .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
      .returning({
        id: comments.id,
        body: comments.body,
        isInternal: comments.isInternal,
        authorId: comments.authorId,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      });
    return updated ?? null;
  }

  async softDelete(id: string) {
    await this.db
      .update(comments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(comments.id, id));
  }
}
