class TicketSummary {
  final int total;
  final int open;
  final int inProgress;
  final int pending;
  final int resolved;
  final int closed;

  const TicketSummary({
    required this.total,
    required this.open,
    required this.inProgress,
    required this.pending,
    required this.resolved,
    required this.closed,
  });

  factory TicketSummary.fromJson(Map<String, dynamic> json) => TicketSummary(
        total: json['total'] as int? ?? 0,
        open: json['open'] as int? ?? 0,
        inProgress: json['in_progress'] as int? ?? 0,
        pending: json['pending'] as int? ?? 0,
        resolved: json['resolved'] as int? ?? 0,
        closed: json['closed'] as int? ?? 0,
      );
}

class AssignedStats {
  final int assigned;
  final int inProgress;
  final int overdue;

  const AssignedStats({
    required this.assigned,
    required this.inProgress,
    required this.overdue,
  });

  factory AssignedStats.fromJson(Map<String, dynamic> json) => AssignedStats(
        assigned: json['assigned'] as int? ?? 0,
        inProgress: json['in_progress'] as int? ?? 0,
        overdue: json['overdue'] as int? ?? 0,
      );
}

class RecentActivity {
  final String id;
  final String action;
  final String? actorName;
  final String? targetType;
  final String? ticketNumber;
  final DateTime createdAt;

  const RecentActivity({
    required this.id,
    required this.action,
    this.actorName,
    this.targetType,
    this.ticketNumber,
    required this.createdAt,
  });

  factory RecentActivity.fromJson(Map<String, dynamic> json) => RecentActivity(
        id: json['id'] as String,
        action: json['action'] as String,
        actorName: json['actorName'] as String?,
        targetType: json['targetType'] as String?,
        ticketNumber: json['ticketNumber'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class DashboardData {
  final TicketSummary ticketSummary;
  final AssignedStats? myAssignedTickets;
  final List<RecentActivity> recentActivities;

  const DashboardData({
    required this.ticketSummary,
    this.myAssignedTickets,
    required this.recentActivities,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) => DashboardData(
        ticketSummary: TicketSummary.fromJson(
            json['ticketSummary'] as Map<String, dynamic>),
        myAssignedTickets: json['myAssignedTickets'] != null
            ? AssignedStats.fromJson(
                json['myAssignedTickets'] as Map<String, dynamic>)
            : null,
        recentActivities: (json['recentActivities'] as List? ?? [])
            .map((e) => RecentActivity.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
