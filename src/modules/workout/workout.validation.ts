import { z } from 'zod';

const goalEnum = z.enum([
  'weight_loss', 'muscle_gain', 'endurance', 'flexibility',
  'general_fitness', 'strength', 'sports_performance',
]);

const dayEnum = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'rest',
]);

const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  category: z.enum(['strength', 'cardio', 'flexibility', 'balance']).optional(),
  sets: z.number().int().positive().optional(),
  reps: z.string().optional(),
  weightKg: z.number().min(0).optional(),
  durationMin: z.number().positive().optional(),
  restSeconds: z.number().min(0).default(60),
  notes: z.string().default(''),
  orderIndex: z.number().int().min(0),
});

const daySchema = z.object({
  day: dayEnum,
  isRestDay: z.boolean().default(false),
  focusArea: z.string().optional(),
  exercises: z.array(exerciseSchema).default([]),
});

const weekSchema = z.object({
  weekNumber: z.number().int().positive(),
  days: z.array(daySchema).min(1, 'At least one day required per week'),
});

export const createWorkoutPlanSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().optional(),
  goal: goalEnum,
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  durationWeeks: z.number().int().positive(),
  isTemplate: z.boolean().default(false),
  memberId: z.string().optional(),
  startDate: z.string().optional(),
  weeks: z.array(weekSchema).default([]),
});

export const updateWorkoutPlanSchema = createWorkoutPlanSchema.partial();

export const assignWorkoutPlanSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  startDate: z.string().optional(),
});

export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>;
export type AssignWorkoutPlanInput = z.infer<typeof assignWorkoutPlanSchema>;
