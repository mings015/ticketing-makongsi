import { apiFetch } from './client';
import type { CategoryDetail } from '$lib/types/categories';

export async function listAllCategories(fetchFn?: typeof fetch) {
  return apiFetch<CategoryDetail[]>('/categories', {}, fetchFn);
}

export async function listActiveCategories(fetchFn?: typeof fetch) {
  return apiFetch<CategoryDetail[]>('/categories?activeOnly=true', {}, fetchFn);
}

export async function createCategory(
  data: { name: string; code?: string; description?: string; isActive?: boolean },
  fetchFn?: typeof fetch,
) {
  return apiFetch<CategoryDetail>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }, fetchFn);
}

export async function updateCategory(
  id: string,
  data: { name?: string; code?: string | null; description?: string | null; isActive?: boolean },
  fetchFn?: typeof fetch,
) {
  return apiFetch<CategoryDetail>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, fetchFn);
}

export async function activateCategory(id: string, fetchFn?: typeof fetch) {
  return apiFetch<{ ok: true }>(`/categories/${id}/activate`, { method: 'PATCH' }, fetchFn);
}

export async function deactivateCategory(id: string, fetchFn?: typeof fetch) {
  return apiFetch<{ ok: true }>(`/categories/${id}/deactivate`, { method: 'PATCH' }, fetchFn);
}

export async function deleteCategory(id: string, fetchFn?: typeof fetch) {
  return apiFetch<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' }, fetchFn);
}
