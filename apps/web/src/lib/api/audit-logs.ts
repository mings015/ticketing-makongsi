import { PUBLIC_API_URL } from '$env/static/public';
import { apiFetch } from './client';
import type { AuditLogsResponse } from '$lib/types/audit-logs';

type AuditLogParams = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  action?: string;
  actorId?: string;
  targetType?: string;
  search?: string;
};

export async function listAuditLogs(params: AuditLogParams = {}, fetchFn?: typeof fetch) {
  const q = new URLSearchParams();
  if (params.page)       q.set('page',       String(params.page));
  if (params.limit)      q.set('limit',      String(params.limit));
  if (params.dateFrom)   q.set('dateFrom',   params.dateFrom);
  if (params.dateTo)     q.set('dateTo',     params.dateTo);
  if (params.action)     q.set('action',     params.action);
  if (params.actorId)    q.set('actorId',    params.actorId);
  if (params.targetType) q.set('targetType', params.targetType);
  if (params.search)     q.set('search',     params.search);
  return apiFetch<AuditLogsResponse>(`/audit-logs?${q}`, {}, fetchFn);
}

export async function getDistinctActions(fetchFn?: typeof fetch) {
  return apiFetch<string[]>('/audit-logs/actions', {}, fetchFn);
}

export function getAuditExportUrl(params: AuditLogParams = {}) {
  const q = new URLSearchParams();
  if (params.dateFrom)   q.set('dateFrom',   params.dateFrom);
  if (params.dateTo)     q.set('dateTo',     params.dateTo);
  if (params.action)     q.set('action',     params.action);
  if (params.search)     q.set('search',     params.search);
  return `${PUBLIC_API_URL}/audit-logs/export${q.toString() ? `?${q}` : ''}`;
}
