import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../providers/tickets_notifier.dart';
import '../../data/models/ticket_models.dart';
import '../../../../core/theme/app_theme.dart';

class TicketListScreen extends ConsumerStatefulWidget {
  const TicketListScreen({super.key});

  @override
  ConsumerState<TicketListScreen> createState() => _TicketListScreenState();
}

class _TicketListScreenState extends ConsumerState<TicketListScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(ticketListProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final filters = ref.watch(ticketFiltersProvider);
    final ticketsAsync = ref.watch(ticketListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tickets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.go('/tickets/new'),
          ),
        ],
      ),
      body: Column(
        children: [
          _SearchAndFilter(
            searchController: _searchController,
            filters: filters,
          ),
          Expanded(
            child: ticketsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(e.toString()),
                  const SizedBox(height: 8),
                  FilledButton(
                    onPressed: () => ref.refresh(ticketListProvider),
                    child: const Text('Coba lagi'),
                  ),
                ]),
              ),
              data: (state) {
                if (state.tickets.isEmpty) {
                  return const Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
                      SizedBox(height: 8),
                      Text('Tidak ada ticket', style: TextStyle(color: Colors.grey)),
                    ]),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(ticketListProvider),
                  child: ListView.separated(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(12),
                    itemCount: state.tickets.length + (state.isLoadingMore ? 1 : 0),
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      if (i >= state.tickets.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }
                      return _TicketCard(
                        ticket: state.tickets[i],
                        onTap: () => context.go('/tickets/${state.tickets[i].id}'),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchAndFilter extends ConsumerStatefulWidget {
  final TextEditingController searchController;
  final TicketFilters filters;

  const _SearchAndFilter({
    required this.searchController,
    required this.filters,
  });

  @override
  ConsumerState<_SearchAndFilter> createState() => _SearchAndFilterState();
}

class _SearchAndFilterState extends ConsumerState<_SearchAndFilter> {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: Column(
        children: [
          TextField(
            controller: widget.searchController,
            decoration: InputDecoration(
              hintText: 'Cari ticket...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: widget.searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        widget.searchController.clear();
                        ref.read(ticketFiltersProvider.notifier).setSearch('');
                      },
                    )
                  : null,
              isDense: true,
            ),
            onChanged: (v) =>
                ref.read(ticketFiltersProvider.notifier).setSearch(v),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _FilterChip(
                  label: 'Status',
                  value: widget.filters.status,
                  options: const ['open', 'in_progress', 'pending', 'resolved', 'closed'],
                  onSelected: (v) => ref.read(ticketFiltersProvider.notifier).setStatus(v),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Prioritas',
                  value: widget.filters.priority,
                  options: const ['critical', 'high', 'medium', 'low'],
                  onSelected: (v) => ref.read(ticketFiltersProvider.notifier).setPriority(v),
                ),
                if (widget.filters.status != null || widget.filters.priority != null) ...[
                  const SizedBox(width: 8),
                  ActionChip(
                    label: const Text('Reset'),
                    onPressed: () => ref.read(ticketFiltersProvider.notifier).reset(),
                    backgroundColor: Colors.red.shade50,
                    labelStyle: const TextStyle(color: Colors.red),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final String? value;
  final List<String> options;
  final void Function(String?) onSelected;

  const _FilterChip({
    required this.label,
    required this.value,
    required this.options,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(value != null ? value!.replaceAll('_', ' ') : label),
      selected: value != null,
      onSelected: (_) => _showMenu(context),
    );
  }

  void _showMenu(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            title: Text('Semua $label'),
            onTap: () { onSelected(null); Navigator.pop(ctx); },
          ),
          ...options.map((o) => ListTile(
                title: Text(o.replaceAll('_', ' ')),
                onTap: () { onSelected(o); Navigator.pop(ctx); },
              )),
        ],
      ),
    );
  }
}

class _TicketCard extends StatelessWidget {
  final Ticket ticket;
  final VoidCallback onTap;

  const _TicketCard({required this.ticket, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final statusColor = StatusColors.forStatus(ticket.status);
    final priorityColor = PriorityColors.forPriority(ticket.priority);
    final date = DateFormat('dd MMM yyyy').format(ticket.createdAt.toLocal());

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Expanded(
                  child: Text(
                    ticket.ticketNumber,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontFamily: 'monospace'),
                  ),
                ),
                _Badge(label: StatusColors.label(ticket.status), color: statusColor),
              ]),
              const SizedBox(height: 6),
              Text(
                ticket.title,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(children: [
                _Badge(label: ticket.priority, color: priorityColor),
                const SizedBox(width: 8),
                if (ticket.categoryName != null)
                  Text(ticket.categoryName!, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                const Spacer(),
                Text(date, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;

  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label.replaceAll('_', ' '),
        style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w500),
      ),
    );
  }
}
