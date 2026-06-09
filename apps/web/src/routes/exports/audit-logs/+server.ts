import type { RequestHandler } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';
import { redirect } from '@sveltejs/kit';

// Proxy export downloads for audit logs, injecting Bearer token server-side.
export const GET: RequestHandler = async ({ url, cookies }) => {
  const token = cookies.get('access_token');
  if (!token) redirect(302, '/login');

  const apiUrl = new URL(`${PUBLIC_API_URL}/audit-logs/export`);
  url.searchParams.forEach((v, k) => apiUrl.searchParams.set(k, v));

  const res = await fetch(apiUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return new Response('Export failed', { status: res.status });

  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': res.headers.get('Content-Disposition') ?? 'attachment; filename="audit-logs.xlsx"',
    },
  });
};
