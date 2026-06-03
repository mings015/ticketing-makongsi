import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  listAllCategories,
  createCategory,
  updateCategory,
  activateCategory,
  deactivateCategory,
  deleteCategory,
} from '$lib/api/categories';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ fetch, parent }) => {
  const { user } = await parent();
  if (!user) redirect(302, '/login');
  const isAdminOrAbove = user.roles?.some((r: string) => ['admin', 'super_admin'].includes(r));
  if (!isAdminOrAbove) redirect(302, '/tickets');

  const categories = await listAllCategories(fetch).catch(() => []);
  return { categories };
};

export const actions: Actions = {
  createCategory: async ({ request, fetch }) => {
    const form = await request.formData();
    const name = form.get('name') as string;
    const code = (form.get('code') as string) || undefined;
    const description = (form.get('description') as string) || undefined;
    const isActive = form.get('isActive') === 'true';

    if (!name || name.length < 2) {
      return fail(400, { error: 'Nama minimal 2 karakter' });
    }

    try {
      await createCategory({ name, code, description, isActive }, fetch);
      return { message: 'Kategori berhasil dibuat' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal membuat kategori' });
    }
  },

  updateCategory: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id') as string;
    const name = form.get('name') as string;
    const code = (form.get('code') as string) || null;
    const description = (form.get('description') as string) || null;
    const isActive = form.get('isActive') === 'true';

    try {
      await updateCategory(id, { name, code, description, isActive }, fetch);
      return { message: 'Kategori berhasil diperbarui' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal memperbarui kategori' });
    }
  },

  toggleActive: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id') as string;
    const currentlyActive = form.get('isActive') === 'true';

    try {
      if (currentlyActive) {
        await deactivateCategory(id, fetch);
      } else {
        await activateCategory(id, fetch);
      }
      return { message: currentlyActive ? 'Kategori dinonaktifkan' : 'Kategori diaktifkan' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal mengubah status kategori' });
    }
  },

  deleteCategory: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id') as string;

    try {
      await deleteCategory(id, fetch);
      return { message: 'Kategori berhasil dihapus' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal menghapus kategori' });
    }
  },
};
