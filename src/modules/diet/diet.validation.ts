import { z } from 'zod';

const goalEnum = z.enum([
  'weight_loss', 'muscle_gain', 'endurance', 'flexibility',
  'general_fitness', 'strength', 'sports_performance',
]);

const foodItemSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  calories: z.number().min(0),
  proteinG: z.number().min(0).optional(),
  carbsG: z.number().min(0).optional(),
  fatG: z.number().min(0).optional(),
  fiberG: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const mealSchema = z.object({
  mealType: z.enum(['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'pre_workout', 'post_workout']),
  time: z.string().optional(),
  items: z.array(foodItemSchema).min(1, 'At least one food item required'),
});

export const createDietPlanSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().optional(),
  goal: goalEnum,
  dietaryPreference: z
    .enum(['none', 'vegetarian', 'vegan', 'keto', 'paleo', 'gluten_free', 'dairy_free'])
    .default('none'),
  dailyCalorieTarget: z.number().positive('Calorie target must be positive'),
  dailyProteinG: z.number().min(0).optional(),
  dailyCarbsG: z.number().min(0).optional(),
  dailyFatG: z.number().min(0).optional(),
  waterLiters: z.number().positive().optional(),
  meals: z.array(mealSchema).default([]),
  isTemplate: z.boolean().default(false),
  memberId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateDietPlanSchema = createDietPlanSchema.partial();

export const assignDietPlanSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateDietPlanInput = z.infer<typeof createDietPlanSchema>;
export type UpdateDietPlanInput = z.infer<typeof updateDietPlanSchema>;
export type AssignDietPlanInput = z.infer<typeof assignDietPlanSchema>;
