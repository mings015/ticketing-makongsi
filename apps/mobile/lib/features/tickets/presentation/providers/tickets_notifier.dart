import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/providers/core_providers.dart';
import '../../data/models/ticket_models.dart';
import '../../data/repositories/tickets_repository.dart';

final ticketsRepositoryProvider = Provider<TicketsRepository>((ref) {
  return TicketsRepository(ref.read(apiClientProvider));
});

// Ticket list filter state
class TicketFilters {
  final String? status;
  final String? priority;
  final String? categoryId;
  final String search;
  final int page;

  const TicketFilters({
    this.status,
    this.priority,
    this.categoryId,
    this.search = '',
    this.page = 1,
  });

  TicketFilters copyWith({
    String? status,
    String? priority,
    String? categoryId,
    String? search,
    int? page,
    bool clearStatus = false,
    bool clearPriority = false,
    bool clearCategory = false,
  }) =>
      TicketFilters(
        status: clearStatus ? null : (status ?? this.status),
        priority: clearPriority ? null : (priority ?? this.priority),
        categoryId: clearCategory ? null : (categoryId ?? this.categoryId),
        search: search ?? this.search,
        page: page ?? this.page,
      );
}

final ticketFiltersProvider =
    StateNotifierProvider<TicketFiltersNotifier, TicketFilters>(
  (_) => TicketFiltersNotifier(),
);

class TicketFiltersNotifier extends StateNotifier<TicketFilters> {
  TicketFiltersNotifier() : super(const TicketFilters());

  void setStatus(String? status) =>
      state = state.copyWith(status: status, clearStatus: status == null, page: 1);
  void setPriority(String? priority) =>
      state = state.copyWith(priority: priority, clearPriority: priority == null, page: 1);
  void setSearch(String search) =>
      state = state.copyWith(search: search, page: 1);
  void nextPage() => state = state.copyWith(page: state.page + 1);
  void reset() => state = const TicketFilters();
}

// Paginated tickets
class TicketListState {
  final List<Ticket> tickets;
  final bool hasMore;
  final bool isLoadingMore;
  final int currentPage;

  const TicketListState({
    this.tickets = const [],
    this.hasMore = true,
    this.isLoadingMore = false,
    this.currentPage = 1,
  });

  TicketListState copyWith({
    List<Ticket>? tickets,
    bool? hasMore,
    bool? isLoadingMore,
    int? currentPage,
  }) =>
      TicketListState(
        tickets: tickets ?? this.tickets,
        hasMore: hasMore ?? this.hasMore,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
        currentPage: currentPage ?? this.currentPage,
      );
}

class TicketListNotifier extends AsyncNotifier<TicketListState> {
  @override
  Future<TicketListState> build() async {
    final filters = ref.watch(ticketFiltersProvider);
    final repo = ref.read(ticketsRepositoryProvider);
    final result = await repo.getTickets(
      page: 1,
      status: filters.status,
      priority: filters.priority,
      categoryId: filters.categoryId,
      search: filters.search,
    );
    return TicketListState(
      tickets: result.data,
      hasMore: result.page < result.totalPages,
      currentPage: 1,
    );
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.isLoadingMore) return;

    state = AsyncData(current.copyWith(isLoadingMore: true));

    final filters = ref.read(ticketFiltersProvider);
    final repo = ref.read(ticketsRepositoryProvider);
    final nextPage = current.currentPage + 1;

    try {
      final result = await repo.getTickets(
        page: nextPage,
        status: filters.status,
        priority: filters.priority,
        categoryId: filters.categoryId,
        search: filters.search,
      );
      state = AsyncData(current.copyWith(
        tickets: [...current.tickets, ...result.data],
        hasMore: result.page < result.totalPages,
        isLoadingMore: false,
        currentPage: nextPage,
      ));
    } catch (e) {
      state = AsyncData(current.copyWith(isLoadingMore: false));
    }
  }
}

final ticketListProvider =
    AsyncNotifierProvider<TicketListNotifier, TicketListState>(
        TicketListNotifier.new);

// Single ticket detail
final ticketDetailProvider =
    FutureProvider.autoDispose.family<TicketDetail, String>((ref, id) {
  return ref.read(ticketsRepositoryProvider).getTicketDetail(id);
});

// Categories for create form
final categoriesProvider =
    FutureProvider.autoDispose<List<Category>>((ref) {
  return ref.read(ticketsRepositoryProvider).getCategories();
});
