import type { Handle, HandleFetch } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};

// Inject Authorization: Bearer header on all server-side fetches to the API.
export const handleFetch: HandleFetch = ({ event, request, fetch }) => {
  if (request.url.startsWith(PUBLIC_API_URL)) {
    const token = event.cookies.get('access_token');
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(request);
};
