import { z } from 'zod';

export const createTicketSchema = z.object({
  title: z.string().min(5, 'Minimal 5 karakter').max(255),
  description: z.string().min(10, 'Minimal 10 karakter'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  categoryId: z.string().optional(),
  dueAt: z.string().optional(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  description: z.string().min(10).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  categoryId: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
});

export const addCommentSchema = z.object({
  body: z.string().min(1, 'Komentar tidak boleh kosong').max(5000),
  isInternal: z.boolean().default(false),
});

export const updateStatusSchema = z.object({
  status: z.enum(['in_progress', 'pending', 'resolved', 'closed']),
  note: z.string().max(1000).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
