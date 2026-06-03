import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ cookies }) => {
  if (cookies.get('access_token')) {
    redirect(302, '/users');
  }
};

export const actions: Actions = {
  default: async ({ request, fetch, cookies }) => {
    const form = await request.formData();
    const email = form.get('email')?.toString() ?? '';
    const password = form.get('password')?.toString() ?? '';

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required' });
    }

    const res = await fetch(`${PUBLIC_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Login failed' }));
      return fail(res.status, { error: (body as { error?: string }).error ?? 'Login failed' });
    }

    // Forward Set-Cookie headers from backend manually via SvelteKit cookies API.
    // Cross-origin server-side fetch does NOT auto-forward Set-Cookie to the browser.
    const setCookieHeaders: string[] =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : [res.headers.get('set-cookie') ?? ''].filter(Boolean);

    for (const cookieStr of setCookieHeaders) {
      const parts = cookieStr.split(';').map((p) => p.trim());

      // Split on first '=' only — JWT values contain '=' chars
      const eqIdx = parts[0].indexOf('=');
      const name = parts[0].slice(0, eqIdx).trim();
      const value = parts[0].slice(eqIdx + 1).trim();

      const attrs: Record<string, string> = {};
      for (const part of parts.slice(1)) {
        const [k, ...v] = part.split('=');
        attrs[k.toLowerCase().trim()] = v.join('=') ?? 'true';
      }

      cookies.set(name, value, {
        path: attrs['path'] ?? '/',
        httpOnly: true,
        secure: attrs['secure'] === 'true',
        sameSite: (attrs['samesite'] as 'lax' | 'strict' | 'none') ?? 'lax',
        maxAge: attrs['max-age'] ? Number(attrs['max-age']) : undefined,
      });
    }

    redirect(302, '/users');
  },
};
