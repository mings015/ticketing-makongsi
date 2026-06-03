import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { apiFetch } from '$lib/api/client';

export const actions: Actions = {
  default: async ({ fetch, cookies }) => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' }, fetch);
    } catch {
      // Ignore errors — clear cookies regardless
    }
    cookies.delete('access_token', { path: '/' });
    cookies.delete('refresh_token', { path: '/auth/refresh' });
    redirect(302, '/login');
  },
};
