import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
});

const settingsSchema = z.object({
  currency: z.string().default('INR'),
  timezone: z.string().default('Asia/Kolkata'),
  openingTime: z.string().default('06:00'),
  closingTime: z.string().default('22:00'),
  maxCapacity: z.number().positive().default(100),
});

export const createGymSchema = z.object({
  name: z.string().min(1, 'Gym name is required').max(100),
  description: z.string().optional(),
  address: addressSchema,
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email'),
  website: z.string().url().optional().or(z.literal('')),
  settings: settingsSchema.optional(),
  // Gym admin details — superadmin provides these; password is auto-generated
  owner: z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Invalid email').toLowerCase(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/, 'Phone must include country code e.g. +91XXXXXXXXXX')
      .optional()
      .or(z.literal('')),
  }),
});

export const updateGymSchema = createGymSchema.partial();

export type CreateGymInput = z.infer<typeof createGymSchema>;
export type UpdateGymInput = z.infer<typeof updateGymSchema>;
