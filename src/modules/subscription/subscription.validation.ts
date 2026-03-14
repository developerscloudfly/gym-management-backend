import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  description: z.string().optional(),
  durationInDays: z.number().int().positive('Duration must be a positive integer'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  currency: z.string().default('INR'),
  features: z.array(z.string()).optional(),
  maxFreeze: z.number().int().min(0).default(0),
});

export const updatePlanSchema = createPlanSchema.partial();

export const assignSubscriptionSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  startDate: z.string().min(1, 'Start date is required'),
  autoRenew: z.boolean().default(false),
});

export const cancelSubscriptionSchema = z.object({
  cancelReason: z.string().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type AssignSubscriptionInput = z.infer<typeof assignSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
