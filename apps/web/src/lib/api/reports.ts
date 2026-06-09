import { apiFetch } from './client';
import type { SlaStats, StaffRow, TicketStats, TrendPoint } from '$lib/types/reports';

type ReportParams = {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  priority?: string;
  status?: string;
  assigneeId?: string;
  period?: string;
};

function buildQuery(params: ReportParams) {
  const q = new URLSearchParams();
  if (params.dateFrom)   q.set('dateFrom',   params.dateFrom);
  if (params.dateTo)     q.set('dateTo',     params.dateTo);
  if (params.categoryId) q.set('categoryId', params.categoryId);
  if (params.priority)   q.set('priority',   params.priority);
  if (params.status)     q.set('status',     params.status);
  if (params.assigneeId) q.set('assigneeId', params.assigneeId);
  if (params.period)     q.set('period',     params.period);
  return q.toString();
}

export async function getTicketStats(params: ReportParams = {}, fetchFn?: typeof fetch) {
  const qs = buildQuery(params);
  return apiFetch<TicketStats>(`/reports/tickets${qs ? `?${qs}` : ''}`, {}, fetchFn);
}

export async function getSlaStats(params: ReportParams = {}, fetchFn?: typeof fetch) {
  const qs = buildQuery(params);
  return apiFetch<SlaStats>(`/reports/sla${qs ? `?${qs}` : ''}`, {}, fetchFn);
}

export async function getStaffStats(params: ReportParams = {}, fetchFn?: typeof fetch) {
  const qs = buildQuery(params);
  return apiFetch<StaffRow[]>(`/reports/staff${qs ? `?${qs}` : ''}`, {}, fetchFn);
}

export async function getTrends(params: ReportParams = {}, fetchFn?: typeof fetch) {
  const qs = buildQuery(params);
  return apiFetch<TrendPoint[]>(`/reports/trends${qs ? `?${qs}` : ''}`, {}, fetchFn);
}

export function getExportUrl(type: 'tickets' | 'sla' | 'staff', params: ReportParams = {}) {
  const q = new URLSearchParams({ type });
  if (params.dateFrom)   q.set('dateFrom',   params.dateFrom);
  if (params.dateTo)     q.set('dateTo',     params.dateTo);
  if (params.categoryId) q.set('categoryId', params.categoryId);
  if (params.priority)   q.set('priority',   params.priority);
  return `/exports/reports?${q}`;
}
