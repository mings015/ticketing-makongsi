import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listTickets, listCategories, createTicket, updateTicket, deleteTicket } from '$lib/api/tickets';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ url, fetch, parent }) => {
  const { user } = await parent();
  if (!user) redirect(302, '/login');

  const page = Number(url.searchParams.get('page') ?? '1');
  const search = url.searchParams.get('search') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;
  const priority = url.searchParams.get('priority') ?? undefined;
  const categoryId = url.searchParams.get('categoryId') ?? undefined;
  const assigneeId = url.searchParams.get('assigneeId') ?? undefined;
  const myTickets = url.searchParams.get('myTickets') === '1';

  const [ticketsResult, categories] = await Promise.all([
    listTickets({
      page,
      search,
      status,
      priority,
      categoryId,
      assigneeId: myTickets ? 'me' : assigneeId,
    }, fetch),
    listCategories(fetch).catch(() => []),
  ]);

  return {
    ...ticketsResult,
    categories,
    filters: { search, status, priority, categoryId, assigneeId, myTickets },
  };
};

export const actions: Actions = {
  createTicket: async ({ request, fetch }) => {
    const form = await request.formData();
    const title = form.get('title') as string;
    const description = form.get('description') as string;
    const priority = form.get('priority') as string || 'medium';
    const categoryId = form.get('categoryId') as string || undefined;
    const dueAt = form.get('dueAt') as string || undefined;

    if (!title || title.length < 5) {
      return fail(400, { error: 'Judul minimal 5 karakter' });
    }
    if (!description || description.length < 10) {
      return fail(400, { error: 'Deskripsi minimal 10 karakter' });
    }

    try {
      await createTicket({ title, description, priority, categoryId, dueAt }, fetch);
      return { message: 'Ticket berhasil dibuat' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal membuat ticket' });
    }
  },

  updateTicket: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id') as string;
    const title = form.get('title') as string;
    const description = form.get('description') as string;
    const priority = form.get('priority') as string || undefined;
    const categoryId = (form.get('categoryId') as string) || null;
    const dueAt = (form.get('dueAt') as string) || null;

    try {
      await updateTicket(id, { title, description, priority, categoryId, dueAt }, fetch);
      return { message: 'Ticket berhasil diperbarui' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal memperbarui ticket' });
    }
  },

  deleteTicket: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = form.get('id') as string;

    try {
      await deleteTicket(id, fetch);
      return { message: 'Ticket berhasil dihapus' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal menghapus ticket' });
    }
  },
};
