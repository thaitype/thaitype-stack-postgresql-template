import { z } from 'zod';

// Zod schemas for API validation
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  roles: z.array(z.enum(['admin'])).default(['admin']),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
  website: z.string().url().optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  roles: z.array(z.enum(['admin'])).optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
  website: z.string().url().optional(),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
  website: z.string().url().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
