export type AuditLogEntry = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  actor: { id: string; fullName: string; email: string } | null;
  payload: unknown;
  ipAddress: string | null;
  createdAt: string;
};

export type AuditLogsResponse = {
  data: AuditLogEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
