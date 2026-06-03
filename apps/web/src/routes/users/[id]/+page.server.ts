import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as usersApi from '$lib/api/users';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, fetch, parent }) => {
  const { user: currentUser } = await parent();
  const isAdminOrAbove = currentUser?.roles?.some((r: string) => ['admin', 'super_admin'].includes(r));
  if (!isAdminOrAbove) redirect(302, '/tickets');

  try {
    const user = await usersApi.getUser(params.id, fetch);
    return { user };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      error(404, 'User not found');
    }
    throw err;
  }
};

export const actions: Actions = {
  updateUser: async ({ request, params, fetch }) => {
    const form = await request.formData();
    const fullName = form.get('fullName')?.toString() || undefined;
    const email = form.get('email')?.toString() || undefined;
    try {
      await usersApi.updateUser(params.id, { fullName, email }, fetch);
      return { success: true };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Failed to update user' });
    }
  },

  activateUser: async ({ params, fetch }) => {
    try {
      await usersApi.activateUser(params.id, fetch);
      return { success: true };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Failed' });
    }
  },

  deactivateUser: async ({ params, fetch }) => {
    try {
      await usersApi.deactivateUser(params.id, fetch);
      return { success: true };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Failed' });
    }
  },

  removeRole: async ({ request, params, fetch }) => {
    const form = await request.formData();
    const roleId = form.get('roleId')?.toString() ?? '';
    try {
      await usersApi.removeRole(params.id, roleId, fetch);
      return { success: true };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Failed' });
    }
  },
};
