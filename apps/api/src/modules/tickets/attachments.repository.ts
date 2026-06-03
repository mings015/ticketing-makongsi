import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../shared/database';
import { attachments } from '../../shared/database/schema';
import type { NewAttachment } from '../../shared/database/schema';

export class AttachmentsRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewAttachment) {
    const [attachment] = await this.db
      .insert(attachments)
      .values(data)
      .returning({
        id: attachments.id,
        fileName: attachments.fileName,
        fileUrl: attachments.fileUrl,
        fileSize: attachments.fileSize,
        mimeType: attachments.mimeType,
        createdAt: attachments.createdAt,
      });
    return attachment;
  }

  async findById(id: string) {
    return this.db.query.attachments.findFirst({
      where: and(eq(attachments.id, id), isNull(attachments.deletedAt)),
    });
  }

  async softDelete(id: string) {
    await this.db
      .update(attachments)
      .set({ deletedAt: new Date() })
      .where(eq(attachments.id, id));
  }
}
