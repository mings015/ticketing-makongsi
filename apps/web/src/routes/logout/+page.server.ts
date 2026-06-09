import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';

export const actions: Actions = {
  default: async ({ fetch, cookies }) => {
    const refreshToken = cookies.get('refresh_token');

    try {
      await fetch(`${PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore errors — clear cookies regardless
    }

    cookies.delete('access_token', { path: '/' });
    cookies.delete('refresh_token', { path: '/' });
    redirect(302, '/login');
  },
};
