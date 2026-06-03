export type TicketSummary = {
  total: number;
  open: number;
  in_progress: number;
  pending: number;
  resolved: number;
  closed: number;
};

export type MyAssignedTickets = {
  assigned: number;
  in_progress: number;
  overdue: number;
};

export type ByPriority = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type ByCategoryItem = {
  id: string | null;
  name: string;
  count: number;
};

export type SlaMonitoring = {
  met: number;
  breached: number;
  percentage: number;
};

export type RecentActivity = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  actorName: string;
  createdAt: string;
};

export type TeamPerformance = {
  completed: number;
  avgResolutionTimeHours: number;
};

export type DashboardStats = {
  ticketSummary: TicketSummary;
  myAssignedTickets: MyAssignedTickets | null;
  byPriority: ByPriority;
  byCategory: ByCategoryItem[];
  slaMonitoring: SlaMonitoring;
  recentActivities: RecentActivity[];
  teamPerformance: TeamPerformance;
};
