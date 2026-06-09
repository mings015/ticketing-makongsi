import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/tickets_notifier.dart';
import '../../data/models/ticket_models.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../auth/presentation/providers/auth_notifier.dart';

class TicketDetailScreen extends ConsumerWidget {
  final String ticketId;
  const TicketDetailScreen({super.key, required this.ticketId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(ticketDetailProvider(ticketId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Ticket'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(ticketDetailProvider(ticketId)),
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (detail) => _DetailBody(detail: detail, ticketId: ticketId),
      ),
    );
  }
}

class _DetailBody extends ConsumerWidget {
  final TicketDetail detail;
  final String ticketId;

  const _DetailBody({required this.detail, required this.ticketId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).valueOrNull?.user;
    final t = detail.ticket;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header
        _InfoCard(ticket: t),
        const SizedBox(height: 12),

        // Status update for support/admin
        if (user != null && !user.isEmployee) ...[
          _StatusUpdateCard(ticket: t, ticketId: ticketId),
          const SizedBox(height: 12),
        ],

        // Description
        _Section(
          title: 'Deskripsi',
          child: Text(t.description, style: const TextStyle(height: 1.5)),
        ),
        const SizedBox(height: 12),

        // Attachments
        if (detail.attachments.isNotEmpty) ...[
          _Section(
            title: 'Lampiran (${detail.attachments.length})',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: detail.attachments.map((a) => _AttachmentChip(a)).toList(),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Comments
        _CommentsSection(comments: detail.comments, ticketId: ticketId),
      ],
    );
  }
}

class _InfoCard extends StatelessWidget {
  final Ticket ticket;
  const _InfoCard({required this.ticket});

  @override
  Widget build(BuildContext context) {
    final statusColor = StatusColors.forStatus(ticket.status);
    final priorityColor = PriorityColors.forPriority(ticket.priority);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(
              ticket.ticketNumber,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontFamily: 'monospace'),
            ),
            const Spacer(),
            _Badge(label: StatusColors.label(ticket.status), color: statusColor),
          ]),
          const SizedBox(height: 8),
          Text(ticket.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _Row('Kategori', ticket.categoryName ?? '—'),
          _Row('Prioritas', ticket.priority.toUpperCase(), valueColor: priorityColor),
          _Row('Requester', ticket.requesterName),
          _Row('Assignee', ticket.assigneeName ?? 'Belum ditugaskan'),
          _Row('Dibuat', DateFormat('dd MMM yyyy, HH:mm').format(ticket.createdAt.toLocal())),
          if (ticket.resolvedAt != null)
            _Row('Selesai', DateFormat('dd MMM yyyy, HH:mm').format(ticket.resolvedAt!.toLocal())),
        ]),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _Row(this.label, this.value, {this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: valueColor),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusUpdateCard extends ConsumerWidget {
  final Ticket ticket;
  final String ticketId;

  const _StatusUpdateCard({required this.ticket, required this.ticketId});

  static const _transitions = {
    'open': ['in_progress', 'pending'],
    'pending': ['in_progress', 'closed'],
    'in_progress': ['resolved', 'pending'],
    'resolved': ['closed'],
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final nextStatuses = _transitions[ticket.status] ?? [];
    if (nextStatuses.isEmpty) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Update Status', style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: nextStatuses.map((s) => OutlinedButton(
              onPressed: () => _updateStatus(context, ref, s),
              style: OutlinedButton.styleFrom(
                foregroundColor: StatusColors.forStatus(s),
                side: BorderSide(color: StatusColors.forStatus(s)),
              ),
              child: Text(StatusColors.label(s)),
            )).toList(),
          ),
        ]),
      ),
    );
  }

  Future<void> _updateStatus(BuildContext context, WidgetRef ref, String status) async {
    try {
      await ref.read(ticketsRepositoryProvider).updateStatus(ticketId, status);
      ref.invalidate(ticketDetailProvider(ticketId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status diperbarui ke ${StatusColors.label(status)}')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;

  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          child,
        ]),
      ),
    );
  }
}

class _AttachmentChip extends StatelessWidget {
  final TicketAttachment attachment;
  const _AttachmentChip(this.attachment);

  @override
  Widget build(BuildContext context) {
    final isImage = attachment.mimeType.startsWith('image/');
    return Chip(
      avatar: Icon(isImage ? Icons.image_outlined : Icons.attach_file, size: 16),
      label: Text(attachment.filename, style: const TextStyle(fontSize: 12)),
    );
  }
}

class _CommentsSection extends ConsumerStatefulWidget {
  final List<Comment> comments;
  final String ticketId;

  const _CommentsSection({required this.comments, required this.ticketId});

  @override
  ConsumerState<_CommentsSection> createState() => _CommentsSectionState();
}

class _CommentsSectionState extends ConsumerState<_CommentsSection> {
  final _commentController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submitComment() async {
    final msg = _commentController.text.trim();
    if (msg.isEmpty) return;
    setState(() => _isSubmitting = true);

    try {
      await ref.read(ticketsRepositoryProvider).addComment(widget.ticketId, msg);
      _commentController.clear();
      ref.invalidate(ticketDetailProvider(widget.ticketId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Komentar (${widget.comments.length})', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 12),
          if (widget.comments.isEmpty)
            Text('Belum ada komentar.', style: TextStyle(color: Colors.grey.shade500, fontSize: 13))
          else
            ...widget.comments.map((c) => _CommentTile(comment: c)),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _commentController,
                maxLines: 3,
                minLines: 1,
                decoration: const InputDecoration(
                  hintText: 'Tulis komentar...',
                  isDense: true,
                ),
                textInputAction: TextInputAction.newline,
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _isSubmitting ? null : _submitComment,
              icon: _isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send),
            ),
          ]),
        ]),
      ),
    );
  }
}

class _CommentTile extends StatelessWidget {
  final Comment comment;
  const _CommentTile({required this.comment});

  @override
  Widget build(BuildContext context) {
    final time = DateFormat('dd MMM, HH:mm').format(comment.createdAt.toLocal());
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            child: Text(
              comment.authorName.isNotEmpty ? comment.authorName[0].toUpperCase() : '?',
              style: const TextStyle(fontSize: 12),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(comment.authorName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(width: 8),
                Text(time, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ]),
              const SizedBox(height: 2),
              Text(comment.message, style: const TextStyle(fontSize: 13, height: 1.4)),
            ]),
          ),
        ],
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500)),
    );
  }
}
