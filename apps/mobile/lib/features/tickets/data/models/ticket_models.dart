class Ticket {
  final String id;
  final String ticketNumber;
  final String title;
  final String description;
  final String status;
  final String priority;
  final String? categoryId;
  final String? categoryName;
  final String requesterId;
  final String requesterName;
  final String? assigneeId;
  final String? assigneeName;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? resolvedAt;
  final DateTime? closedAt;

  const Ticket({
    required this.id,
    required this.ticketNumber,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    this.categoryId,
    this.categoryName,
    required this.requesterId,
    required this.requesterName,
    this.assigneeId,
    this.assigneeName,
    required this.createdAt,
    required this.updatedAt,
    this.resolvedAt,
    this.closedAt,
  });

  factory Ticket.fromJson(Map<String, dynamic> json) {
    final category = json['category'] as Map<String, dynamic>?;
    final requester = json['requester'] as Map<String, dynamic>?;
    final assignee = json['assignee'] as Map<String, dynamic>?;
    return Ticket(
      id: json['id'] as String,
      ticketNumber: json['ticketNumber'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      status: json['status'] as String,
      priority: json['priority'] as String,
      categoryId: category?['id'] as String?,
      categoryName: category?['name'] as String?,
      requesterId: requester?['id'] as String? ?? '',
      requesterName: requester?['fullName'] as String? ?? '',
      assigneeId: assignee?['id'] as String?,
      assigneeName: assignee?['fullName'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      resolvedAt: json['resolvedAt'] != null
          ? DateTime.parse(json['resolvedAt'] as String)
          : null,
      closedAt: json['closedAt'] != null
          ? DateTime.parse(json['closedAt'] as String)
          : null,
    );
  }
}

class Comment {
  final String id;
  final String authorId;
  final String authorName;
  final String message;
  final bool isInternal;
  final DateTime createdAt;

  const Comment({
    required this.id,
    this.authorId = '',
    required this.authorName,
    required this.message,
    required this.isInternal,
    required this.createdAt,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    final author = json['author'] as Map<String, dynamic>? ?? {};
    return Comment(
      id: json['id'] as String,
      authorId: author['id'] as String? ?? '',
      authorName: author['fullName'] as String? ?? '',
      message: json['body'] as String? ?? '',
      isInternal: json['isInternal'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class TicketAttachment {
  final String id;
  final String filename;
  final String url;
  final String mimeType;

  const TicketAttachment({
    required this.id,
    required this.filename,
    required this.url,
    required this.mimeType,
  });

  factory TicketAttachment.fromJson(Map<String, dynamic> json) =>
      TicketAttachment(
        id: json['id'] as String,
        filename: json['fileName'] as String? ?? '',
        url: json['fileUrl'] as String? ?? '',
        mimeType: json['mimeType'] as String? ?? '',
      );
}

class TicketDetail {
  final Ticket ticket;
  final List<Comment> comments;
  final List<TicketAttachment> attachments;

  const TicketDetail({
    required this.ticket,
    required this.comments,
    required this.attachments,
  });
}

class PaginatedTickets {
  final List<Ticket> data;
  final int total;
  final int page;
  final int totalPages;

  const PaginatedTickets({
    required this.data,
    required this.total,
    required this.page,
    required this.totalPages,
  });

  factory PaginatedTickets.fromJson(Map<String, dynamic> json) {
    final meta = json['meta'] as Map<String, dynamic>;
    return PaginatedTickets(
      data: (json['data'] as List)
          .map((e) => Ticket.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: meta['total'] as int,
      page: meta['page'] as int,
      totalPages: meta['totalPages'] as int,
    );
  }
}

class Category {
  final String id;
  final String name;
  final String? code;

  const Category({required this.id, required this.name, this.code});

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        name: json['name'] as String,
        code: json['code'] as String?,
      );
}
