import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getMe } from '$lib/api/users';

const PUBLIC_PATHS = ['/login'];

export const load: LayoutServerLoad = async ({ url, cookies, fetch }) => {
  if (PUBLIC_PATHS.includes(url.pathname)) return {};

  const token = cookies.get('access_token');
  if (!token) redirect(302, '/login');

  try {
    // handleFetch in hooks.server.ts auto-forwards the access_token cookie
    const user = await getMe(fetch);
    return { user };
  } catch {
    redirect(302, '/login');
  }
};
