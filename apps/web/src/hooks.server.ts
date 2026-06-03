import type { Handle, HandleFetch } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};

// Automatically forward access_token cookie on all server-side fetches to the API.
// This is necessary because cross-origin server-side fetch does not send cookies by default.
export const handleFetch: HandleFetch = ({ event, request, fetch }) => {
  if (request.url.startsWith(PUBLIC_API_URL)) {
    const token = event.cookies.get('access_token');
    const refreshToken = event.cookies.get('refresh_token');

    const cookieParts: string[] = [];
    if (token) cookieParts.push(`access_token=${token}`);
    if (refreshToken) cookieParts.push(`refresh_token=${refreshToken}`);

    if (cookieParts.length > 0) {
      request.headers.set('Cookie', cookieParts.join('; '));
    }
  }

  return fetch(request);
};
