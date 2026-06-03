import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  getTicket,
  updateTicket,
  assignTicket,
  updateTicketStatus,
  addComment,
  deleteComment,
  deleteAttachment,
  listCategories,
  uploadAttachment,
} from '$lib/api/tickets';
import { listUsers } from '$lib/api/users';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, fetch, parent }) => {
  const { user } = await parent();
  if (!user) redirect(302, '/login');

  try {
    const [ticket, categories, supportUsers] = await Promise.all([
      getTicket(params.id, fetch),
      listCategories(fetch).catch(() => []),
      listUsers({ role: 'support', limit: 100 }, fetch).catch(() => ({ data: [] })),
    ]);
    return { ticket, categories, supportUsers: supportUsers.data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      error(404, 'Ticket tidak ditemukan');
    }
    throw err;
  }
};

export const actions: Actions = {
  updateTicket: async ({ request, params, fetch }) => {
    const form = await request.formData();
    const title = form.get('title') as string;
    const description = form.get('description') as string;
    const priority = form.get('priority') as string || undefined;
    const categoryId = (form.get('categoryId') as string) || null;
    const dueAt = (form.get('dueAt') as string) || null;

    try {
      await updateTicket(params.id, { title, description, priority, categoryId, dueAt }, fetch);
      return { message: 'Ticket berhasil diperbarui' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal memperbarui ticket' });
    }
  },

  assignTicket: async ({ request, params, fetch }) => {
    const form = await request.formData();
    const assigneeId = (form.get('assigneeId') as string) || null;

    try {
      await assignTicket(params.id, assigneeId, fetch);
      return { message: assigneeId ? 'Ticket berhasil di-assign' : 'Ticket berhasil di-unassign' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal assign ticket' });
    }
  },

  updateStatus: async ({ request, params, fetch }) => {
    const form = await request.formData();
    const status = form.get('status') as string;
    const note = (form.get('note') as string) || undefined;

    try {
      await updateTicketStatus(params.id, status, note, fetch);
      return { message: 'Status ticket berhasil diperbarui' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal mengubah status' });
    }
  },

  addComment: async ({ request, params, fetch }) => {
    const form = await request.formData();
    const body = form.get('body') as string;
    const isInternal = form.get('isInternal') === 'true';

    if (!body || body.trim().length === 0) {
      return fail(400, { error: 'Komentar tidak boleh kosong' });
    }

    try {
      await addComment(params.id, { body, isInternal }, fetch);
      return { message: 'Komentar berhasil ditambahkan' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal menambahkan komentar' });
    }
  },

  deleteComment: async ({ request, params, fetch }) => {
    const form = await request.formData();
    const commentId = form.get('commentId') as string;

    try {
      await deleteComment(params.id, commentId, fetch);
      return { message: 'Komentar berhasil dihapus' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal menghapus komentar' });
    }
  },

  uploadAttachment: async ({ request, params, fetch }) => {
    const form = await request.formData();
    const file = form.get('file') as File | null;

    if (!file || file.size === 0) {
      return fail(400, { error: 'File tidak boleh kosong' });
    }

    try {
      await uploadAttachment(params.id, file, fetch);
      return { message: 'Lampiran berhasil diunggah' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal mengunggah lampiran' });
    }
  },

  deleteAttachment: async ({ request, params, fetch }) => {
    const form = await request.formData();
    const attachmentId = form.get('attachmentId') as string;

    try {
      await deleteAttachment(params.id, attachmentId, fetch);
      return { message: 'Attachment berhasil dihapus' };
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, { error: err.message });
      return fail(500, { error: 'Gagal menghapus attachment' });
    }
  },
};
