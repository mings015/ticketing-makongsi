import { PUBLIC_API_URL } from '$env/static/public';
import { apiFetch, ApiError } from './client';
import type {
  Category,
  TicketDetail,
  TicketSummary,
  TicketsListResponse,
} from '$lib/types/tickets';

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  assigneeId?: string;
  requesterId?: string;
};

export async function listTickets(params: ListParams = {}, fetchFn?: typeof fetch) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.priority) query.set('priority', params.priority);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.assigneeId) query.set('assigneeId', params.assigneeId);
  if (params.requesterId) query.set('requesterId', params.requesterId);
  return apiFetch<TicketsListResponse>(`/tickets?${query}`, {}, fetchFn);
}

export async function getTicket(id: string, fetchFn?: typeof fetch) {
  return apiFetch<TicketDetail>(`/tickets/${id}`, {}, fetchFn);
}

export async function createTicket(
  data: {
    title: string;
    description: string;
    priority?: string;
    categoryId?: string;
    dueAt?: string;
  },
  fetchFn?: typeof fetch,
) {
  return apiFetch<TicketSummary>('/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  }, fetchFn);
}

export async function updateTicket(
  id: string,
  data: {
    title?: string;
    description?: string;
    priority?: string;
    categoryId?: string | null;
    dueAt?: string | null;
  },
  fetchFn?: typeof fetch,
) {
  return apiFetch<{ id: string; title: string; priority: string; updatedAt: string }>(
    `/tickets/${id}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    fetchFn,
  );
}

export async function assignTicket(
  id: string,
  assigneeId: string | null,
  fetchFn?: typeof fetch,
) {
  return apiFetch<{ ok: true }>(
    `/tickets/${id}/assign`,
    { method: 'PATCH', body: JSON.stringify({ assigneeId }) },
    fetchFn,
  );
}

export async function updateTicketStatus(
  id: string,
  status: string,
  note?: string,
  fetchFn?: typeof fetch,
) {
  return apiFetch<{ ok: true }>(
    `/tickets/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status, note }) },
    fetchFn,
  );
}

export async function deleteTicket(id: string, fetchFn?: typeof fetch) {
  return apiFetch<{ ok: true }>(`/tickets/${id}`, { method: 'DELETE' }, fetchFn);
}

export async function addComment(
  ticketId: string,
  data: { body: string; isInternal?: boolean },
  fetchFn?: typeof fetch,
) {
  return apiFetch<{ id: string; body: string; isInternal: boolean; author: { id: string; fullName: string }; createdAt: string; updatedAt: string }>(
    `/tickets/${ticketId}/comments`,
    { method: 'POST', body: JSON.stringify(data) },
    fetchFn,
  );
}

export async function updateComment(
  ticketId: string,
  commentId: string,
  body: string,
  fetchFn?: typeof fetch,
) {
  return apiFetch<{ id: string; body: string; isInternal: boolean; author: { id: string; fullName: string }; createdAt: string; updatedAt: string }>(
    `/tickets/${ticketId}/comments/${commentId}`,
    { method: 'PATCH', body: JSON.stringify({ body }) },
    fetchFn,
  );
}

export async function deleteComment(
  ticketId: string,
  commentId: string,
  fetchFn?: typeof fetch,
) {
  return apiFetch<{ ok: true }>(
    `/tickets/${ticketId}/comments/${commentId}`,
    { method: 'DELETE' },
    fetchFn,
  );
}

export async function uploadAttachment(
  ticketId: string,
  file: File,
  fetchFn?: typeof fetch,
) {
  const form = new FormData();
  form.append('file', file);
  const res = await (fetchFn ?? fetch)(
    `${PUBLIC_API_URL}/tickets/${ticketId}/attachments`,
    { method: 'POST', body: form, credentials: 'include' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, (body as { error?: string }).error ?? 'Upload failed');
  }
  return res.json();
}

export async function deleteAttachment(
  ticketId: string,
  attachmentId: string,
  fetchFn?: typeof fetch,
) {
  return apiFetch<{ ok: true }>(
    `/tickets/${ticketId}/attachments/${attachmentId}`,
    { method: 'DELETE' },
    fetchFn,
  );
}

export async function listCategories(fetchFn?: typeof fetch) {
  return apiFetch<Category[]>('/categories', {}, fetchFn);
}
