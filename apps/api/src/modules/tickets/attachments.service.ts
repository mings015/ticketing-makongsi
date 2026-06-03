import type { Database } from '../../shared/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { generateId } from '../../shared/utils/uuid';
import { saveFile, validateFileSize, validateMimeType } from '../../shared/utils/storage';
import type { CurrentUser } from '../../shared/plugins/auth.plugin';
import { AttachmentsRepository } from './attachments.repository';
import { TicketsRepository } from './tickets.repository';

export class AttachmentsService {
  private readonly repo: AttachmentsRepository;
  private readonly ticketsRepo: TicketsRepository;

  constructor(private readonly db: Database) {
    this.repo = new AttachmentsRepository(db);
    this.ticketsRepo = new TicketsRepository(db);
  }

  async upload(ticketId: string, file: File, currentUser: CurrentUser) {
    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);

    if (ticket.status === 'closed') {
      throw new BadRequestError('Cannot upload attachment to a closed ticket');
    }

    const isEmployee = currentUser.roles.includes('employee') &&
      !currentUser.roles.some((r) => ['support', 'admin', 'super_admin'].includes(r));

    if (isEmployee && ticket.requesterId !== currentUser.id) {
      throw new ForbiddenError('You can only upload attachments to your own tickets');
    }

    if (!validateMimeType(file.type)) {
      throw new BadRequestError(`File type '${file.type}' is not allowed`);
    }

    if (!validateFileSize(file.size)) {
      throw new BadRequestError('File size exceeds the 10 MB limit');
    }

    const stored = await saveFile(file);

    const attachment = await this.repo.create({
      id: generateId(),
      ticketId,
      uploadedBy: currentUser.id,
      fileName: file.name,
      storedName: stored.storedName,
      fileUrl: stored.fileUrl,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
    });

    await this.ticketsRepo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'ticket.attachment_added',
      targetType: 'ticket',
      targetId: ticketId,
      payload: { attachmentId: attachment.id, fileName: file.name },
    });

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt.toISOString(),
    };
  }

  async delete(ticketId: string, attachmentId: string, currentUser: CurrentUser) {
    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);

    const attachment = await this.repo.findById(attachmentId);
    if (!attachment || attachment.ticketId !== ticketId) {
      throw new NotFoundError('Attachment', attachmentId);
    }

    const isAdminOrAbove = currentUser.roles.some((r) =>
      ['admin', 'super_admin'].includes(r),
    );

    if (attachment.uploadedBy !== currentUser.id && !isAdminOrAbove) {
      throw new ForbiddenError('Only the uploader or an admin can delete this attachment');
    }

    await this.repo.softDelete(attachmentId);

    await this.ticketsRepo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'ticket.attachment_deleted',
      targetType: 'ticket',
      targetId: ticketId,
      payload: { attachmentId, fileName: attachment.fileName },
    });

    return { ok: true as const };
  }
}
