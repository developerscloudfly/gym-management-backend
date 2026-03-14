import { z } from 'zod';

export const createMemberSchema = z.object({
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
    .regex(/^\+[1-9]\d{6,14}$/, 'Include country code e.g. +91XXXXXXXXXX')
    .optional(),
  // Optional profile fields at registration
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  fitnessGoal: z
    .enum([
      'weight_loss',
      'muscle_gain',
      'endurance',
      'flexibility',
      'general_fitness',
      'strength',
      'sports_performance',
    ])
    .optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

export const updateMemberSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/)
    .optional(),
  avatar: z.string().optional(),
});

export const updateMemberProfileSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  fitnessGoal: z
    .enum([
      'weight_loss',
      'muscle_gain',
      'endurance',
      'flexibility',
      'general_fitness',
      'strength',
      'sports_performance',
    ])
    .optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  dietaryPreference: z
    .enum(['none', 'vegetarian', 'vegan', 'keto', 'paleo', 'gluten_free', 'dairy_free'])
    .optional(),
  medicalConditions: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1),
      phone: z.string().min(1),
      relation: z.string().min(1),
    })
    .optional(),
});

export const addBodyMetricSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  weightKg: z.number().positive('Weight must be positive'),
  bodyFatPct: z.number().min(0).max(100).optional(),
  muscleMassKg: z.number().positive().optional(),
  bmi: z.number().positive().optional(),
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  biceps: z.number().positive().optional(),
  thighs: z.number().positive().optional(),
  notes: z.string().optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>;
export type AddBodyMetricInput = z.infer<typeof addBodyMetricSchema>;
