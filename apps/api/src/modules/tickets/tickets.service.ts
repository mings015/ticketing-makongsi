import type { Database } from '../../shared/database';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors';
import { generateId } from '../../shared/utils/uuid';
import type { CurrentUser } from '../../shared/plugins/auth.plugin';
import type { TicketStatus, TicketPriority } from '../../shared/database/schema';
import { CommentsRepository } from './comments.repository';
import { TicketsRepository, type TicketListParams } from './tickets.repository';

type CreateParams = {
  title: string;
  description: string;
  priority?: TicketPriority;
  categoryId?: string;
  dueAt?: string;
};

type UpdateParams = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  categoryId?: string | null;
  dueAt?: string | null;
};

type ListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  assigneeId?: string;
  requesterId?: string;
};

type TransitionRule = { roles: string[] };

const TRANSITIONS: Record<TicketStatus, Partial<Record<TicketStatus, TransitionRule>>> = {
  open: {
    in_progress: { roles: ['support', 'admin', 'super_admin'] },
    closed: { roles: ['admin', 'super_admin'] },
  },
  in_progress: {
    pending: { roles: ['support', 'admin', 'super_admin'] },
    resolved: { roles: ['support', 'admin', 'super_admin'] },
    closed: { roles: ['admin', 'super_admin'] },
  },
  pending: {
    in_progress: { roles: ['employee', 'support', 'admin', 'super_admin'] },
    closed: { roles: ['admin', 'super_admin'] },
  },
  resolved: {
    in_progress: { roles: ['employee', 'admin', 'super_admin'] },
    closed: { roles: ['employee', 'admin', 'super_admin'] },
  },
  closed: {},
};

function canActorTransition(
  from: TicketStatus,
  to: TicketStatus,
  actorRoles: string[],
): boolean {
  const rule = TRANSITIONS[from]?.[to];
  if (!rule) return false;
  return actorRoles.some((r) => rule.roles.includes(r));
}

function getYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

export class TicketsService {
  private readonly repo: TicketsRepository;
  private readonly commentsRepo: CommentsRepository;

  constructor(private readonly db: Database) {
    this.repo = new TicketsRepository(db);
    this.commentsRepo = new CommentsRepository(db);
  }

  async list(query: ListQuery, currentUser: CurrentUser) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const isEmployee = currentUser.roles.includes('employee') &&
      !currentUser.roles.some((r) => ['support', 'admin', 'super_admin'].includes(r));
    const isSupport = currentUser.roles.includes('support') &&
      !currentUser.roles.some((r) => ['admin', 'super_admin'].includes(r));

    const params: TicketListParams = {
      page,
      limit,
      search: query.search,
      status: query.status as TicketStatus | undefined,
      priority: query.priority as TicketPriority | undefined,
      categoryId: query.categoryId,
      currentUserId: currentUser.id,
    };

    if (isEmployee) {
      params.forceRequesterId = currentUser.id;
    } else {
      if (isSupport) {
        params.showUnassignedOrMine = true;
      }
      if (query.assigneeId === 'me') {
        params.assigneeId = currentUser.id;
        params.showUnassignedOrMine = false;
      } else if (query.assigneeId) {
        params.assigneeId = query.assigneeId;
        params.showUnassignedOrMine = false;
      }
      if (query.requesterId) {
        params.requesterId = query.requesterId;
      }
    }

    const { rows, total } = await this.repo.findAll(params);

    const data = rows.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      status: t.status,
      priority: t.priority,
      category: t.categoryId ? { id: t.categoryId, name: t.categoryName ?? '' } : null,
      requester: { id: t.requesterId, fullName: t.requesterFullName ?? '' },
      assignee: t.assigneeId ? { id: t.assigneeId, fullName: t.assigneeFullName ?? '' } : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, currentUser: CurrentUser) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundError('Ticket', id);

    const isEmployee = currentUser.roles.includes('employee') &&
      !currentUser.roles.some((r) => ['support', 'admin', 'super_admin'].includes(r));

    if (isEmployee && ticket.requesterId !== currentUser.id) {
      throw new NotFoundError('Ticket', id);
    }

    const includeInternal = !isEmployee;
    const [rawComments, rawAttachments] = await Promise.all([
      this.repo.findCommentsByTicketId(id, includeInternal),
      this.repo.findAttachmentsByTicketId(id),
    ]);

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.categoryId ? { id: ticket.categoryId, name: ticket.categoryName ?? '' } : null,
      requester: {
        id: ticket.requesterId,
        fullName: ticket.requesterFullName ?? '',
        email: ticket.requesterEmail ?? '',
      },
      assignee: ticket.assigneeId
        ? { id: ticket.assigneeId, fullName: ticket.assigneeFullName ?? '' }
        : null,
      dueAt: ticket.dueAt?.toISOString() ?? null,
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      closedAt: ticket.closedAt?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      comments: rawComments.map((c) => ({
        id: c.id,
        body: c.body,
        isInternal: c.isInternal,
        author: { id: c.authorId, fullName: c.authorFullName ?? '' },
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      attachments: rawAttachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        uploadedBy: { id: a.uploadedById, fullName: a.uploadedByFullName ?? '' },
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  private async validateCategoryActive(categoryId: string) {
    const cat = await this.repo.findCategoryById(categoryId);
    if (!cat) throw new NotFoundError('Category', categoryId);
    if (!cat.isActive) {
      throw new BadRequestError(`Kategori '${cat.name}' sedang nonaktif dan tidak dapat digunakan`);
    }
  }

  async create(data: CreateParams, currentUser: CurrentUser) {
    if (data.categoryId) {
      await this.validateCategoryActive(data.categoryId);
    }

    const ym = getYearMonth();
    let ticketNumber: string;
    let ticket: Awaited<ReturnType<TicketsRepository['create']>>;

    // Retry up to 3 times on ticket number collision
    let attempts = 0;
    while (true) {
      ticketNumber = await this.repo.generateTicketNumber(ym);
      try {
        ticket = await this.repo.create({
          id: generateId(),
          ticketNumber,
          title: data.title,
          description: data.description,
          priority: data.priority ?? 'medium',
          categoryId: data.categoryId ?? null,
          requesterId: currentUser.id,
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
          status: 'open',
        });
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('unique') && ++attempts < 3) continue;
        throw err;
      }
    }

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'ticket.created',
      targetType: 'ticket',
      targetId: ticket!.id,
    });

    const notifyUsers = await this.repo.findUsersByRoles(['support', 'admin']);
    for (const u of notifyUsers) {
      if (u.id === currentUser.id) continue;
      await this.repo.createNotification({
        id: generateId(),
        userId: u.id,
        type: 'ticket_created',
        title: 'Ticket Baru',
        body: `Ticket baru dibuat: ${ticket!.ticketNumber} — ${data.title}`,
        ticketId: ticket!.id,
      });
    }

    return {
      id: ticket!.id,
      ticketNumber: ticket!.ticketNumber,
      title: data.title,
      status: ticket!.status,
      priority: ticket!.priority,
      createdAt: ticket!.createdAt.toISOString(),
    };
  }

  async update(id: string, data: UpdateParams, currentUser: CurrentUser) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundError('Ticket', id);

    const isEmployee = currentUser.roles.includes('employee') &&
      !currentUser.roles.some((r) => ['support', 'admin', 'super_admin'].includes(r));

    if (isEmployee) {
      if (ticket.requesterId !== currentUser.id) {
        throw new ForbiddenError('You can only update your own tickets');
      }
      if (ticket.status !== 'open') {
        throw new ForbiddenError('Employee can only update tickets with status open');
      }
    } else {
      if (ticket.status === 'closed') {
        throw new BadRequestError('Cannot update a closed ticket');
      }
    }

    if (data.categoryId) {
      await this.validateCategoryActive(data.categoryId);
    }

    const updated = await this.repo.update(id, {
      title: data.title,
      description: data.description,
      priority: data.priority,
      categoryId: data.categoryId,
      dueAt: data.dueAt !== undefined ? (data.dueAt ? new Date(data.dueAt) : null) : undefined,
    });

    if (!updated) throw new NotFoundError('Ticket', id);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'ticket.updated',
      targetType: 'ticket',
      targetId: id,
    });

    return {
      id: updated.id,
      title: updated.title,
      priority: updated.priority,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async assign(
    id: string,
    assigneeId: string | null,
    currentUser: CurrentUser,
  ) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundError('Ticket', id);

    if (ticket.status === 'closed') {
      throw new BadRequestError('Cannot assign a closed ticket');
    }

    const previousAssigneeId = ticket.assigneeId;

    if (assigneeId !== null) {
      const assigneeRoles = await this.repo.findUserRoles(assigneeId);
      const canBeAssigned = assigneeRoles.some((r) =>
        ['support', 'admin', 'super_admin'].includes(r),
      );
      if (!canBeAssigned) {
        throw new BadRequestError('Assignee must have role support or admin');
      }
    }

    await this.repo.assign(id, assigneeId);

    let newStatus = ticket.status;
    if (assigneeId !== null && ticket.status === 'open') {
      await this.repo.updateStatus(id, 'in_progress');
      newStatus = 'in_progress';
    }

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'ticket.assigned',
      targetType: 'ticket',
      targetId: id,
      payload: { assigneeId, previousAssigneeId },
    });

    if (assigneeId) {
      await this.repo.createNotification({
        id: generateId(),
        userId: assigneeId,
        type: 'ticket_assigned',
        title: 'Ticket Ditugaskan',
        body: `Ticket ${ticket.ticketNumber} ditugaskan kepada Anda`,
        ticketId: id,
      });
    }

    if (previousAssigneeId && previousAssigneeId !== assigneeId) {
      await this.repo.createNotification({
        id: generateId(),
        userId: previousAssigneeId,
        type: 'ticket_updated',
        title: 'Penugasan Ticket Berubah',
        body: `Ticket ${ticket.ticketNumber} telah di-reassign`,
        ticketId: id,
      });
    }

    return { ok: true as const, newStatus };
  }

  async updateStatus(
    id: string,
    params: { status: TicketStatus; note?: string },
    currentUser: CurrentUser,
  ) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundError('Ticket', id);

    if (ticket.status === 'closed') {
      throw new BadRequestError('Cannot change status of a closed ticket');
    }

    const allowed = canActorTransition(ticket.status, params.status, currentUser.roles);
    if (!allowed) {
      const rule = TRANSITIONS[ticket.status]?.[params.status];
      if (!rule) {
        throw new BadRequestError(
          `Invalid transition from '${ticket.status}' to '${params.status}'`,
        );
      }
      throw new ForbiddenError(
        `Your role cannot transition ticket from '${ticket.status}' to '${params.status}'`,
      );
    }

    const timestamps: { resolvedAt?: Date | null; closedAt?: Date | null } = {};
    if (params.status === 'resolved') {
      timestamps.resolvedAt = new Date();
    } else if (params.status === 'closed') {
      timestamps.closedAt = new Date();
    } else if (params.status === 'in_progress' && ticket.status === 'resolved') {
      timestamps.resolvedAt = null;
    }

    await this.repo.updateStatus(id, params.status, timestamps);

    if (params.note) {
      await this.commentsRepo.create({
        id: generateId(),
        ticketId: id,
        authorId: currentUser.id,
        body: params.note,
        isInternal: true,
      });
    }

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: `ticket.${params.status}`,
      targetType: 'ticket',
      targetId: id,
      payload: params.note ? { note: params.note } : undefined,
    });

    await this.sendStatusNotification(ticket, params.status, currentUser.id);

    return { ok: true as const };
  }

  private async sendStatusNotification(
    ticket: { id: string; ticketNumber: string; requesterId: string; assigneeId: string | null },
    newStatus: TicketStatus,
    actorId: string,
  ) {
    type NotifType = 'ticket_created' | 'ticket_assigned' | 'ticket_updated' | 'ticket_resolved' | 'ticket_closed' | 'comment_added';

    const notifyRequester = async (type: NotifType, body: string) => {
      if (ticket.requesterId !== actorId) {
        await this.repo.createNotification({
          id: generateId(),
          userId: ticket.requesterId,
          type,
          title: body,
          body,
          ticketId: ticket.id,
        });
      }
    };

    const notifyAssignee = async (body: string) => {
      if (ticket.assigneeId && ticket.assigneeId !== actorId) {
        await this.repo.createNotification({
          id: generateId(),
          userId: ticket.assigneeId,
          type: 'ticket_updated',
          title: body,
          body,
          ticketId: ticket.id,
        });
      }
    };

    switch (newStatus) {
      case 'pending':
        await notifyRequester('ticket_updated', `Ticket ${ticket.ticketNumber} memerlukan respons Anda`);
        break;
      case 'resolved':
        await notifyRequester('ticket_resolved', `Ticket ${ticket.ticketNumber} telah diselesaikan, mohon konfirmasi`);
        break;
      case 'closed':
        await notifyRequester('ticket_closed', `Ticket ${ticket.ticketNumber} telah ditutup`);
        if (ticket.assigneeId) {
          await notifyAssignee(`Ticket ${ticket.ticketNumber} telah ditutup`);
        }
        break;
      case 'in_progress':
        await notifyAssignee(`Ticket ${ticket.ticketNumber} dilanjutkan kembali`);
        break;
    }
  }

  async softDelete(id: string, currentUser: CurrentUser) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundError('Ticket', id);

    await this.repo.softDelete(id);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: currentUser.id,
      action: 'ticket.deleted',
      targetType: 'ticket',
      targetId: id,
    });

    return { ok: true as const };
  }
}
