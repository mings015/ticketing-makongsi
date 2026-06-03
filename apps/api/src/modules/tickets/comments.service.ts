import type { Database } from '../../shared/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { generateId } from '../../shared/utils/uuid';
import type { CurrentUser } from '../../shared/plugins/auth.plugin';
import { CommentsRepository } from './comments.repository';
import { TicketsRepository } from './tickets.repository';

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

type CreateParams = {
  body: string;
  isInternal?: boolean;
};

export class CommentsService {
  private readonly repo: CommentsRepository;
  private readonly ticketsRepo: TicketsRepository;

  constructor(private readonly db: Database) {
    this.repo = new CommentsRepository(db);
    this.ticketsRepo = new TicketsRepository(db);
  }

  async create(ticketId: string, data: CreateParams, currentUser: CurrentUser) {
    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);

    if (ticket.status === 'closed') {
      throw new BadRequestError('Cannot add comment to a closed ticket');
    }

    const isEmployee = currentUser.roles.includes('employee') &&
      !currentUser.roles.some((r) => ['support', 'admin', 'super_admin'].includes(r));

    if (isEmployee && ticket.requesterId !== currentUser.id) {
      throw new ForbiddenError('You can only comment on your own tickets');
    }

    if (data.isInternal && isEmployee) {
      throw new ForbiddenError('Employee cannot create internal notes');
    }

    const comment = await this.repo.create({
      id: generateId(),
      ticketId,
      authorId: currentUser.id,
      body: data.body,
      isInternal: data.isInternal ?? false,
    });

    // Auto-transition: employee replies on pending ticket → in_progress
    if (isEmployee && ticket.status === 'pending') {
      await this.ticketsRepo.updateStatus(ticketId, 'in_progress');
      await this.ticketsRepo.createAuditLog({
        id: generateId(),
        actorId: currentUser.id,
        action: 'ticket.in_progress',
        targetType: 'ticket',
        targetId: ticketId,
        payload: { reason: 'requester_reply' },
      });
      if (ticket.assigneeId) {
        await this.ticketsRepo.createNotification({
          id: generateId(),
          userId: ticket.assigneeId,
          type: 'ticket_updated',
          title: 'Requester Membalas',
          body: `Requester telah membalas ticket ${ticket.ticketNumber}`,
          ticketId,
        });
      }
    }

    await this.ticketsRepo.createNotification({
      id: generateId(),
      userId: isEmployee ? (ticket.assigneeId ?? ticket.requesterId) : ticket.requesterId,
      type: 'comment_added',
      title: 'Komentar Baru',
      body: `Komentar baru pada ticket ${ticket.ticketNumber}`,
      ticketId,
    });

    return {
      id: comment.id,
      body: comment.body,
      isInternal: comment.isInternal,
      author: { id: currentUser.id, fullName: currentUser.fullName },
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  async update(
    ticketId: string,
    commentId: string,
    body: string,
    currentUser: CurrentUser,
  ) {
    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);

    const comment = await this.repo.findById(commentId);
    if (!comment || comment.ticketId !== ticketId) {
      throw new NotFoundError('Comment', commentId);
    }

    if (comment.authorId !== currentUser.id) {
      throw new ForbiddenError('Only the comment author can edit this comment');
    }

    const ageMs = Date.now() - comment.createdAt.getTime();
    if (ageMs > EDIT_WINDOW_MS) {
      throw new ForbiddenError('Comment can no longer be edited after 24 hours');
    }

    const updated = await this.repo.update(commentId, body);
    if (!updated) throw new NotFoundError('Comment', commentId);

    return {
      id: updated.id,
      body: updated.body,
      isInternal: updated.isInternal,
      author: { id: currentUser.id, fullName: currentUser.fullName },
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async delete(ticketId: string, commentId: string, currentUser: CurrentUser) {
    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);

    const comment = await this.repo.findById(commentId);
    if (!comment || comment.ticketId !== ticketId) {
      throw new NotFoundError('Comment', commentId);
    }

    const isAdminOrAbove = currentUser.roles.some((r) =>
      ['admin', 'super_admin'].includes(r),
    );

    if (comment.authorId !== currentUser.id && !isAdminOrAbove) {
      throw new ForbiddenError('Only the author or an admin can delete this comment');
    }

    await this.repo.softDelete(commentId);
    return { ok: true as const };
  }
}
