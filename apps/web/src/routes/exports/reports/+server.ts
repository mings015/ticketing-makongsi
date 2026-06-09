import type { RequestHandler } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';
import { redirect } from '@sveltejs/kit';

// Proxy export downloads for reports, injecting Bearer token server-side.
// The browser cannot send Authorization headers via window.open(), so we proxy here.
export const GET: RequestHandler = async ({ url, cookies, parent }) => {
  const token = cookies.get('access_token');
  if (!token) redirect(302, '/login');

  const type = url.searchParams.get('type');
  if (!['tickets', 'sla', 'staff'].includes(type ?? '')) {
    return new Response('Invalid export type', { status: 400 });
  }

  const apiUrl = new URL(`${PUBLIC_API_URL}/reports/${type}/export`);
  url.searchParams.forEach((v, k) => {
    if (k !== 'type') apiUrl.searchParams.set(k, v);
  });

  const res = await fetch(apiUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return new Response('Export failed', { status: res.status });

  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': res.headers.get('Content-Disposition') ?? `attachment; filename="report-${type}.xlsx"`,
    },
  });
};
