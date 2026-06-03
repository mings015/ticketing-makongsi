import { apiFetch } from './client';
import type { UserDetail, UserSummary, UsersListResponse } from '../types/users';

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
};

export async function listUsers(params: ListParams = {}, fetchFn?: typeof fetch) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.role) query.set('role', params.role);
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive));

  return apiFetch<UsersListResponse>(`/users?${query}`, {}, fetchFn);
}

export async function getUser(id: string, fetchFn?: typeof fetch) {
  return apiFetch<UserDetail>(`/users/${id}`, {}, fetchFn);
}

export async function getMe(fetchFn?: typeof fetch) {
  return apiFetch<UserSummary>('/users/me', {}, fetchFn);
}

export async function createUser(
  data: { fullName: string; email: string; password: string; roles: string[] },
  fetchFn?: typeof fetch,
) {
  return apiFetch<UserSummary>('/users', { method: 'POST', body: JSON.stringify(data) }, fetchFn);
}

export async function changePassword(
  id: string,
  password: string,
  confirmPassword: string,
  fetchFn?: typeof fetch,
) {
  return apiFetch<{ ok: true }>(
    `/users/${id}/password`,
    { method: 'PATCH', body: JSON.stringify({ password, confirmPassword }) },
    fetchFn,
  );
}

export async function updateUser(
  id: string,
  data: { fullName?: string; email?: string },
  fetchFn?: typeof fetch,
) {
  return apiFetch<{ id: string; email: string; fullName: string; updatedAt: string }>(
    `/users/${id}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    fetchFn,
  );
}

export async function activateUser(id: string, fetchFn?: typeof fetch) {
  return apiFetch<{ ok: true }>(`/users/${id}/activate`, { method: 'PATCH' }, fetchFn);
}

export async function deactivateUser(id: string, fetchFn?: typeof fetch) {
  return apiFetch<{ ok: true }>(`/users/${id}/deactivate`, { method: 'PATCH' }, fetchFn);
}

export async function deleteUser(id: string, fetchFn?: typeof fetch) {
  return apiFetch<{ ok: true }>(`/users/${id}`, { method: 'DELETE' }, fetchFn);
}

export async function assignRole(userId: string, roleId: string, fetchFn?: typeof fetch) {
  return apiFetch<{ ok: true }>(
    `/users/${userId}/roles`,
    { method: 'POST', body: JSON.stringify({ roleId }) },
    fetchFn,
  );
}

export async function removeRole(userId: string, roleId: string, fetchFn?: typeof fetch) {
  return apiFetch<{ ok: true }>(`/users/${userId}/roles/${roleId}`, { method: 'DELETE' }, fetchFn);
}
