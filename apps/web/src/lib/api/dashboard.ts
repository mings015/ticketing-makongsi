import { apiFetch } from './client';
import type { DashboardStats } from '$lib/types/dashboard';

type DashboardParams = {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  priority?: string;
  status?: string;
};

export async function getDashboardStats(params: DashboardParams = {}, fetchFn?: typeof fetch) {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.priority) query.set('priority', params.priority);
  if (params.status) query.set('status', params.status);

  const qs = query.toString();
  return apiFetch<DashboardStats>(`/dashboard${qs ? `?${qs}` : ''}`, {}, fetchFn);
}
