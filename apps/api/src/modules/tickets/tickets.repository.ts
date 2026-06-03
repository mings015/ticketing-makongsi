import { and, asc, count, desc, eq, ilike, inArray, isNull, like, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '../../shared/database';
import {
  attachments,
  auditLogs,
  categories,
  comments,
  notifications,
  roles,
  tickets,
  userRoles,
  users,
} from '../../shared/database/schema';
import type {
  NewAuditLog,
  NewNotification,
  NewTicket,
  TicketPriority,
  TicketStatus,
} from '../../shared/database/schema';

const requesterAlias = alias(users, 'requester');
const assigneeAlias = alias(users, 'assignee');
const commentAuthorAlias = alias(users, 'comment_author');
const attachmentUploaderAlias = alias(users, 'attachment_uploader');

export type TicketListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assigneeId?: string;
  requesterId?: string;
  forceRequesterId?: string;
  showUnassignedOrMine?: boolean;
  currentUserId?: string;
};

export class TicketsRepository {
  constructor(private readonly db: Database) {}

  async generateTicketNumber(ym: string): Promise<string> {
    const prefix = `TKT-${ym}-`;
    const [result] = await this.db
      .select({ ticketNumber: tickets.ticketNumber })
      .from(tickets)
      .where(like(tickets.ticketNumber, `${prefix}%`))
      .orderBy(desc(tickets.ticketNumber))
      .limit(1);

    let seq = 1;
    if (result) {
      const parts = result.ticketNumber.split('-');
      seq = parseInt(parts[2], 10) + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async create(data: NewTicket) {
    const [ticket] = await this.db
      .insert(tickets)
      .values(data)
      .returning({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
      });
    return ticket;
  }

  async findAll(params: TicketListParams) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [isNull(tickets.deletedAt)];

    if (params.forceRequesterId) {
      conditions.push(eq(tickets.requesterId, params.forceRequesterId));
    }

    if (params.showUnassignedOrMine && params.currentUserId) {
      conditions.push(
        or(isNull(tickets.assigneeId), eq(tickets.assigneeId, params.currentUserId))!,
      );
    }

    if (params.search) {
      conditions.push(
        or(
          ilike(tickets.title, `%${params.search}%`),
          ilike(tickets.ticketNumber, `%${params.search}%`),
        )!,
      );
    }
    if (params.status) {
      conditions.push(eq(tickets.status, params.status));
    }
    if (params.priority) {
      conditions.push(eq(tickets.priority, params.priority));
    }
    if (params.categoryId) {
      conditions.push(eq(tickets.categoryId, params.categoryId));
    }
    if (params.assigneeId) {
      conditions.push(eq(tickets.assigneeId, params.assigneeId));
    }
    if (params.requesterId) {
      conditions.push(eq(tickets.requesterId, params.requesterId));
    }

    const where = and(...conditions);

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(tickets)
      .where(where);

    const rows = await this.db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
        categoryId: tickets.categoryId,
        categoryName: categories.name,
        requesterId: tickets.requesterId,
        requesterFullName: requesterAlias.fullName,
        assigneeId: tickets.assigneeId,
        assigneeFullName: assigneeAlias.fullName,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .leftJoin(
        categories,
        and(eq(tickets.categoryId, categories.id), isNull(categories.deletedAt)),
      )
      .leftJoin(requesterAlias, eq(tickets.requesterId, requesterAlias.id))
      .leftJoin(assigneeAlias, eq(tickets.assigneeId, assigneeAlias.id))
      .where(where)
      .orderBy(desc(tickets.createdAt))
      .limit(params.limit)
      .offset(offset);

    return { rows, total: Number(totalRow.count) };
  }

  async findById(id: string) {
    const [ticket] = await this.db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        status: tickets.status,
        priority: tickets.priority,
        categoryId: tickets.categoryId,
        categoryName: categories.name,
        requesterId: tickets.requesterId,
        requesterFullName: requesterAlias.fullName,
        requesterEmail: requesterAlias.email,
        assigneeId: tickets.assigneeId,
        assigneeFullName: assigneeAlias.fullName,
        dueAt: tickets.dueAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .leftJoin(
        categories,
        and(eq(tickets.categoryId, categories.id), isNull(categories.deletedAt)),
      )
      .leftJoin(requesterAlias, eq(tickets.requesterId, requesterAlias.id))
      .leftJoin(assigneeAlias, eq(tickets.assigneeId, assigneeAlias.id))
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
      .limit(1);

    return ticket ?? null;
  }

  async findCommentsByTicketId(ticketId: string, includeInternal: boolean) {
    const conditions = [eq(comments.ticketId, ticketId), isNull(comments.deletedAt)];
    if (!includeInternal) {
      conditions.push(eq(comments.isInternal, false));
    }

    return this.db
      .select({
        id: comments.id,
        body: comments.body,
        isInternal: comments.isInternal,
        authorId: comments.authorId,
        authorFullName: commentAuthorAlias.fullName,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .leftJoin(commentAuthorAlias, eq(comments.authorId, commentAuthorAlias.id))
      .where(and(...conditions))
      .orderBy(asc(comments.createdAt));
  }

  async findAttachmentsByTicketId(ticketId: string) {
    return this.db
      .select({
        id: attachments.id,
        fileName: attachments.fileName,
        fileUrl: attachments.fileUrl,
        fileSize: attachments.fileSize,
        mimeType: attachments.mimeType,
        uploadedById: attachments.uploadedBy,
        uploadedByFullName: attachmentUploaderAlias.fullName,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .leftJoin(attachmentUploaderAlias, eq(attachments.uploadedBy, attachmentUploaderAlias.id))
      .where(and(eq(attachments.ticketId, ticketId), isNull(attachments.deletedAt)));
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      priority: TicketPriority;
      categoryId: string | null;
      dueAt: Date | null;
    }>,
  ) {
    const [updated] = await this.db
      .update(tickets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
      .returning({
        id: tickets.id,
        title: tickets.title,
        priority: tickets.priority,
        updatedAt: tickets.updatedAt,
      });
    return updated ?? null;
  }

  async assign(id: string, assigneeId: string | null) {
    await this.db
      .update(tickets)
      .set({ assigneeId, updatedAt: new Date() })
      .where(eq(tickets.id, id));
  }

  async updateStatus(
    id: string,
    status: TicketStatus,
    timestamps: { resolvedAt?: Date | null; closedAt?: Date | null } = {},
  ) {
    await this.db
      .update(tickets)
      .set({ status, ...timestamps, updatedAt: new Date() })
      .where(eq(tickets.id, id));
  }

  async softDelete(id: string) {
    await this.db
      .update(tickets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tickets.id, id));
  }

  async findUsersByRoles(roleNames: string[]): Promise<{ id: string }[]> {
    if (roleNames.length === 0) return [];

    const roleRows = await this.db
      .select({ roleId: roles.id })
      .from(roles)
      .where(inArray(roles.name, roleNames));

    if (roleRows.length === 0) return [];
    const roleIds = roleRows.map((r) => r.roleId);

    return this.db
      .selectDistinct({ id: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .where(
        and(
          isNull(users.deletedAt),
          eq(users.isActive, true),
          inArray(userRoles.roleId, roleIds),
        ),
      );
  }

  async findCategoryById(id: string) {
    return this.db.query.categories.findFirst({
      where: and(eq(categories.id, id), isNull(categories.deletedAt)),
      columns: { id: true, name: true, isActive: true },
    });
  }

  async findUserRoles(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    return rows.map((r) => r.name);
  }

  async createAuditLog(data: NewAuditLog) {
    await this.db.insert(auditLogs).values(data);
  }

  async createNotification(data: NewNotification) {
    await this.db.insert(notifications).values(data);
  }
}
