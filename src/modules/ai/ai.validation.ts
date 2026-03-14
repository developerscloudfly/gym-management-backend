import { z } from 'zod';

export const generateWorkoutSchema = z.object({
  body: z.object({
    memberId: z.string().min(1),
    durationWeeks: z.number().int().min(1).max(16).default(4),
    daysPerWeek: z.number().int().min(1).max(7).default(3),
    additionalNotes: z.string().max(500).optional(),
  }),
});

export const generateDietSchema = z.object({
  body: z.object({
    memberId: z.string().min(1),
    targetCalories: z.number().int().min(1000).max(6000).optional(),
    additionalNotes: z.string().max(500).optional(),
  }),
});

export const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(1000),
    gymId: z.string().min(1),
  }),
});

export const scanFoodSchema = z.object({
  body: z.object({
    imageBase64: z.string().min(1, 'Image data is required'),
  }),
});

export type GenerateWorkoutInput = z.infer<typeof generateWorkoutSchema>['body'];
export type GenerateDietInput = z.infer<typeof generateDietSchema>['body'];
export type ChatInput = z.infer<typeof chatSchema>['body'];
