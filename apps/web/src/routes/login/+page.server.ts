import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ cookies }) => {
  if (cookies.get('access_token')) {
    redirect(302, '/');
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

    const { accessToken, refreshToken } = await res.json() as {
      accessToken: string;
      refreshToken: string;
    };

    const IS_PROD = process.env.NODE_ENV === 'production';

    cookies.set('access_token', accessToken, {
      path: '/',
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: 900,
    });

    cookies.set('refresh_token', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: 604800,
    });

    redirect(302, '/');
  },
};
