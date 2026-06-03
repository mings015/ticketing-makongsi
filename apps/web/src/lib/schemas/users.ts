import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email address'),
  roles: z.array(z.string()).min(1, 'Select at least one role'),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(255).optional(),
    email: z.string().email('Invalid email address').optional(),
  })
  .refine((d) => d.fullName ?? d.email, { message: 'At least one field is required' });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
