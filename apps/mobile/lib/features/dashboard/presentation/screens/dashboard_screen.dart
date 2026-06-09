import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../auth/presentation/providers/auth_notifier.dart';
import '../providers/dashboard_notifier.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/data/models/dashboard_models.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider).valueOrNull;
    final user = authState?.user;
    final dashboardAsync = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Halo, ${user?.fullName.split(' ').first ?? ''}!'),
            Text(
              _roleLabel(user?.primaryRole ?? ''),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(dashboardProvider),
          ),
        ],
      ),
      body: dashboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(error: e.toString(), onRetry: () => ref.refresh(dashboardProvider)),
        data: (data) => _DashboardBody(data: data, user: user),
      ),
    );
  }

  String _roleLabel(String role) => switch (role) {
        'super_admin' => 'Super Admin',
        'admin' => 'Admin',
        'support' => 'Support',
        _ => 'Employee',
      };
}

class _DashboardBody extends StatelessWidget {
  final DashboardData data;
  final dynamic user;

  const _DashboardBody({required this.data, required this.user});

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {},
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SummarySection(summary: data.ticketSummary, user: user),
          if (data.myAssignedTickets != null) ...[
            const SizedBox(height: 16),
            _AssignedSection(stats: data.myAssignedTickets!),
          ],
          if (user != null && user.isAdmin) ...[
            const SizedBox(height: 16),
            _RecentActivitiesSection(activities: data.recentActivities),
          ],
        ],
      ),
    );
  }
}

class _SummarySection extends StatelessWidget {
  final TicketSummary summary;
  final dynamic user;

  const _SummarySection({required this.summary, required this.user});

  @override
  Widget build(BuildContext context) {
    final isEmployee = user?.isEmployee ?? true;

    if (isEmployee) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Ringkasan Ticket Saya', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _StatCard('Aktif', summary.open + summary.inProgress, StatusColors.forStatus('open'))),
            const SizedBox(width: 8),
            Expanded(child: _StatCard('Pending', summary.pending, StatusColors.forStatus('pending'))),
            const SizedBox(width: 8),
            Expanded(child: _StatCard('Closed', summary.closed, StatusColors.forStatus('closed'))),
          ]),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Ringkasan Ticket', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 1.1,
          children: [
            _StatCard('Total', summary.total, Colors.grey.shade700),
            _StatCard('Open', summary.open, StatusColors.forStatus('open')),
            _StatCard('In Progress', summary.inProgress, StatusColors.forStatus('in_progress')),
            _StatCard('Pending', summary.pending, StatusColors.forStatus('pending')),
            _StatCard('Resolved', summary.resolved, StatusColors.forStatus('resolved')),
            _StatCard('Closed', summary.closed, StatusColors.forStatus('closed')),
          ],
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _StatCard(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('$value', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade600), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _AssignedSection extends StatelessWidget {
  final AssignedStats stats;
  const _AssignedSection({required this.stats});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Assigned ke Saya', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _StatCard('Assigned', stats.assigned, Colors.blue)),
          const SizedBox(width: 8),
          Expanded(child: _StatCard('In Progress', stats.inProgress, Colors.orange)),
          const SizedBox(width: 8),
          Expanded(child: _StatCard('Overdue', stats.overdue, Colors.red)),
        ]),
      ],
    );
  }
}

class _RecentActivitiesSection extends StatelessWidget {
  final List<RecentActivity> activities;
  const _RecentActivitiesSection({required this.activities});

  @override
  Widget build(BuildContext context) {
    if (activities.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Aktivitas Terbaru', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        ...activities.take(8).map((a) => _ActivityTile(activity: a)),
      ],
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final RecentActivity activity;
  const _ActivityTile({required this.activity});

  @override
  Widget build(BuildContext context) {
    final label = activity.action.replaceAll('.', ' › ').replaceAll('_', ' ');
    final time = DateFormat('dd MMM, HH:mm').format(activity.createdAt.toLocal());

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(Icons.circle, size: 8, color: Color(0xFF3B82F6)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(fontSize: 13)),
              Text(
                '${activity.actorName ?? 'System'} · $time',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;
  const _ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 12),
          Text(error, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          FilledButton(onPressed: onRetry, child: const Text('Coba lagi')),
        ]),
      ),
    );
  }
}
