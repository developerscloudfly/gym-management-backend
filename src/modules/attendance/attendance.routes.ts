import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  checkInSchema,
  checkOutSchema,
  markClassAttendanceSchema,
} from './attendance.validation';
import * as attendanceController from './attendance.controller';

const router = Router({ mergeParams: true });

router.use(authenticate, belongsToGym);

// Member views their own attendance
router.get('/my', attendanceController.getMyAttendance);

// Gym-wide attendance — admin/staff only
router.get(
  '/',
  authorize('gym_admin', 'staff'),
  attendanceController.getGymAttendance
);

// Check-in / check-out — staff or admin record attendance
router.post(
  '/',
  authorize('gym_admin', 'staff', 'trainer'),
  validate(checkInSchema),
  attendanceController.checkIn
);
router.patch(
  '/:attendanceId/checkout',
  authorize('gym_admin', 'staff', 'trainer'),
  validate(checkOutSchema),
  attendanceController.checkOut
);

// Per-member attendance
router.get(
  '/member/:memberId',
  authorize('gym_admin', 'staff', 'trainer'),
  attendanceController.getMemberAttendance
);
router.get(
  '/member/:memberId/summary',
  authorize('gym_admin', 'staff', 'trainer'),
  attendanceController.getAttendanceSummary
);

// Class bulk attendance marking
router.post(
  '/class/:classId',
  authorize('gym_admin', 'trainer'),
  validate(markClassAttendanceSchema),
  attendanceController.markClassAttendance
);

export default router;
