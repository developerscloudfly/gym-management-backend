import { z } from 'zod';

export const checkInSchema = z.object({
  body: z.object({
    memberId: z.string().min(1, 'Member ID is required'),
    type: z.enum(['gym_checkin', 'class']).default('gym_checkin'),
    classId: z.string().optional(),
    checkInTime: z.string().datetime().optional(),
    status: z.enum(['present', 'absent', 'late']).default('present'),
    notes: z.string().max(300).optional(),
  }),
});

export const checkOutSchema = z.object({
  body: z.object({
    checkOutTime: z.string().datetime().optional(),
  }),
});

export const markClassAttendanceSchema = z.object({
  body: z.object({
    attendances: z.array(
      z.object({
        memberId: z.string().min(1),
        status: z.enum(['present', 'absent', 'late']),
        notes: z.string().max(300).optional(),
      })
    ).min(1),
  }),
});

export type CheckInInput = z.infer<typeof checkInSchema>['body'];
export type MarkClassAttendanceInput = z.infer<typeof markClassAttendanceSchema>['body'];
