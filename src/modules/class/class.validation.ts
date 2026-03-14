import { z } from 'zod';

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    category: z.string().max(50).optional(),
    trainerId: z.string().min(1, 'Trainer ID is required'),
    startTime: z.string().datetime({ message: 'Invalid startTime format' }),
    endTime: z.string().datetime({ message: 'Invalid endTime format' }),
    capacity: z.number().int().min(1),
    location: z.string().max(200).optional(),
    recurrence: z.enum(['none', 'daily', 'weekly']).default('none'),
  }),
});

export const updateClassSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    category: z.string().max(50).optional(),
    trainerId: z.string().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    capacity: z.number().int().min(1).optional(),
    location: z.string().max(200).optional(),
    recurrence: z.enum(['none', 'daily', 'weekly']).optional(),
    status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
  }),
});

export const enrollSchema = z.object({
  body: z.object({
    memberId: z.string().min(1, 'Member ID is required'),
  }),
});

export type CreateClassInput = z.infer<typeof createClassSchema>['body'];
export type UpdateClassInput = z.infer<typeof updateClassSchema>['body'];
