import { z } from 'zod';

// Record a manual (cash/card/etc.) payment by staff/admin
export const recordPaymentSchema = z.object({
  body: z.object({
    memberId: z.string().min(1),
    subscriptionId: z.string().optional(),
    amount: z.number().positive(),
    currency: z.string().length(3).default('INR'),
    method: z.enum(['cash', 'card', 'upi', 'bank_transfer']),
    notes: z.string().max(300).optional(),
    paidAt: z.string().datetime().optional(),
  }),
});

// Member initiates an online Razorpay order
export const createOrderSchema = z.object({
  body: z.object({
    subscriptionId: z.string().min(1),
    currency: z.string().length(3).default('INR'),
  }),
});

// Member verifies Razorpay payment after redirect
export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>['body'];
export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>['body'];
