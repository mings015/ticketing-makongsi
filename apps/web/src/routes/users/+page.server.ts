import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as usersApi from '$lib/api/users';

export const load: PageServerLoad = async ({ url, fetch, parent }) => {
  const { user } = await parent();
  const isAdminOrAbove = user?.roles?.some((r: string) => ['admin', 'super_admin'].includes(r));
  if (!isAdminOrAbove) redirect(302, '/tickets');

  const page = Number(url.searchParams.get('page') ?? 1);
  const search = url.searchParams.get('search') ?? undefined;
  const role = url.searchParams.get('role') ?? undefined;
  const isActiveParam = url.searchParams.get('isActive');
  const isActive = isActiveParam === null ? undefined : isActiveParam === 'true';

  const result = await usersApi.listUsers({ page, limit: 20, search, role, isActive }, fetch);
  return { ...result, filters: { search, role, isActive } };
};

export const actions: Actions = {
  createUser: async ({ request, fetch }) => {
    const form = await request.formData();
    const fullName = form.get('fullName')?.toString() ?? '';
    const email = form.get('email')?.toString() ?? '';
    const roles = form.getAll('roles').map(String);

    if (!fullName || !email || roles.length === 0) {
      return fail(400, { error: 'All fields are required' });
    }

    const password = form.get('password')?.toString() ?? '';
    if (!password) return fail(400, { error: 'Password wajib diisi' });

    try {
      await usersApi.createUser({ fullName, email, password, roles }, fetch);
      return { message: `User ${fullName} berhasil dibuat` };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Gagal membuat user' });
    }
  },

  updateUser: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id')?.toString() ?? '';
    const fullName = form.get('fullName')?.toString() || undefined;
    const email = form.get('email')?.toString() || undefined;

    try {
      await usersApi.updateUser(id, { fullName, email }, fetch);
      return { message: 'User berhasil diperbarui' };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Gagal memperbarui user' });
    }
  },

  activateUser: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id')?.toString() ?? '';
    try {
      await usersApi.activateUser(id, fetch);
      return { message: 'User berhasil diaktifkan' };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Gagal mengaktifkan user' });
    }
  },

  deactivateUser: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id')?.toString() ?? '';
    try {
      await usersApi.deactivateUser(id, fetch);
      return { message: 'User berhasil dinonaktifkan' };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Gagal menonaktifkan user' });
    }
  },

  deleteUser: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id')?.toString() ?? '';
    try {
      await usersApi.deleteUser(id, fetch);
      return { message: 'User berhasil dihapus' };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Gagal menghapus user' });
    }
  },

  changePassword: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id')?.toString() ?? '';
    const password = form.get('password')?.toString() ?? '';
    const confirmPassword = form.get('confirmPassword')?.toString() ?? '';

    if (password.length < 8) return fail(400, { error: 'Password minimal 8 karakter' });
    if (password !== confirmPassword) return fail(400, { error: 'Password dan konfirmasi tidak sama' });

    try {
      await usersApi.changePassword(id, password, confirmPassword, fetch);
      return { message: 'Password berhasil diubah' };
    } catch (err) {
      return fail(400, { error: err instanceof Error ? err.message : 'Gagal mengubah password' });
    }
  },
};
