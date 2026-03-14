import { z } from 'zod';

export const createTrainerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Include country code')
    .optional(),
  specialization: z.string().optional(),
});

export const updateTrainerSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/).optional(),
  avatar: z.string().optional(),
});

export type CreateTrainerInput = z.infer<typeof createTrainerSchema>;
export type UpdateTrainerInput = z.infer<typeof updateTrainerSchema>;
