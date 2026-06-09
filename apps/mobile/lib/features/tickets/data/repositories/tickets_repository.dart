import '../../../../core/network/api_client.dart';
import '../models/ticket_models.dart';

class TicketsRepository {
  final ApiClient _api;

  const TicketsRepository(this._api);

  Future<PaginatedTickets> getTickets({
    int page = 1,
    int limit = 20,
    String? status,
    String? priority,
    String? categoryId,
    String? search,
    String sort = 'newest',
  }) async {
    return _api.get<PaginatedTickets>(
      '/tickets',
      queryParameters: {
        'page': page,
        'limit': limit,
        if (status != null) 'status': status,
        if (priority != null) 'priority': priority,
        if (categoryId != null) 'categoryId': categoryId,
        if (search != null && search.isNotEmpty) 'search': search,
        'sort': sort,
      },
      fromJson: (json) =>
          PaginatedTickets.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<Ticket> getTicket(String id) async {
    return _api.get<Ticket>(
      '/tickets/$id',
      fromJson: (json) =>
          Ticket.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<List<Comment>> getComments(String ticketId) async {
    final data = await _api.get<Map<String, dynamic>>(
      '/tickets/$ticketId',
      fromJson: (json) => json as Map<String, dynamic>,
    );
    final comments = data['comments'] as List? ?? [];
    return comments
        .map((e) => Comment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<TicketAttachment>> getAttachments(String ticketId) async {
    final data = await _api.get<Map<String, dynamic>>(
      '/tickets/$ticketId',
      fromJson: (json) => json as Map<String, dynamic>,
    );
    final attachments = data['attachments'] as List? ?? [];
    return attachments
        .map((e) => TicketAttachment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<TicketDetail> getTicketDetail(String id) async {
    final data = await _api.get<Map<String, dynamic>>(
      '/tickets/$id',
      fromJson: (json) => json as Map<String, dynamic>,
    );

    final ticket = Ticket.fromJson(data);
    final comments = (data['comments'] as List? ?? [])
        .map((e) => Comment.fromJson(e as Map<String, dynamic>))
        .toList();
    final attachments = (data['attachments'] as List? ?? [])
        .map((e) => TicketAttachment.fromJson(e as Map<String, dynamic>))
        .toList();

    return TicketDetail(ticket: ticket, comments: comments, attachments: attachments);
  }

  Future<void> createTicket({
    required String title,
    required String description,
    required String priority,
    required String categoryId,
  }) async {
    await _api.post<void>(
      '/tickets',
      data: {
        'title': title,
        'description': description,
        'priority': priority,
        'categoryId': categoryId,
      },
    );
  }

  Future<void> updateStatus(String ticketId, String status) async {
    await _api.patch<void>('/tickets/$ticketId/status', data: {'status': status});
  }

  Future<Comment> addComment(String ticketId, String message) async {
    return _api.post<Comment>(
      '/tickets/$ticketId/comments',
      data: {'body': message},
      fromJson: (json) => Comment.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<List<Category>> getCategories() async {
    final list = await _api.get<List<dynamic>>(
      '/categories',
      queryParameters: {'activeOnly': 'true'},
      fromJson: (json) => json as List<dynamic>,
    );
    return list
        .map((e) => Category.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
