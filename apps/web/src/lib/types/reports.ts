export type TicketReportRow = {
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  categoryName: string | null;
  requesterName: string | null;
  assigneeName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
};

export type TicketReportSummary = {
  total: number;
  open: number;
  in_progress: number;
  pending: number;
  resolved: number;
  closed: number;
};

export type TicketStats = {
  summary: TicketReportSummary;
  rows: TicketReportRow[];
};

export type SlaRow = {
  ticketNumber: string;
  title: string;
  priority: string;
  status: string;
  slaTargetHours: number;
  slaActualHours: number | null;
  slaStatus: 'met' | 'breached' | 'ongoing';
  createdAt: string;
};

export type SlaSummary = {
  met: number;
  breached: number;
  percentage: number;
};

export type SlaStats = {
  summary: SlaSummary;
  rows: SlaRow[];
};

export type StaffRow = {
  assigneeId: string;
  fullName: string;
  assigned: number;
  resolved: number;
  avgResolutionHours: number | null;
  slaMet: number;
  slaBreached: number;
  slaRate: number | null;
};

export type TrendPoint = {
  period: string;
  count: number;
};
