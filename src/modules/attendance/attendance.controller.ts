import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { p } from '../../utils/param';
import * as attendanceService from './attendance.service';

export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const userId = req.user!._id.toString();
  const record = await attendanceService.checkIn(gymId, req.body, userId);
  sendResponse({ res, statusCode: 201, message: 'Check-in recorded', data: record });
});

export const checkOut = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const attendanceId = p(req.params.attendanceId);
  const userId = req.user!._id.toString();
  const record = await attendanceService.checkOut(gymId, attendanceId, req.body.checkOutTime, userId);
  sendResponse({ res, statusCode: 200, message: 'Check-out recorded', data: record });
});

export const markClassAttendance = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const classId = p(req.params.classId);
  const userId = req.user!._id.toString();
  const records = await attendanceService.markClassAttendance(gymId, classId, req.body, userId);
  sendResponse({ res, statusCode: 201, message: 'Class attendance marked', data: records });
});

export const getMemberAttendance = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const memberId = p(req.params.memberId);
  const opts = getPaginationOptions(req);
  const filters = {
    type: req.query.type as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  };
  const { records, meta } = await attendanceService.getMemberAttendance(gymId, memberId, opts, filters);
  sendResponse({ res, statusCode: 200, message: 'Attendance records retrieved', data: records, meta });
});

export const getGymAttendance = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const opts = getPaginationOptions(req);
  const filters = {
    type: req.query.type as string | undefined,
    memberId: req.query.memberId as string | undefined,
    classId: req.query.classId as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  };
  const { records, meta } = await attendanceService.getGymAttendance(gymId, opts, filters);
  sendResponse({ res, statusCode: 200, message: 'Gym attendance retrieved', data: records, meta });
});

export const getAttendanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const memberId = p(req.params.memberId);
  const summary = await attendanceService.getAttendanceSummary(gymId, memberId);
  sendResponse({ res, statusCode: 200, message: 'Attendance summary retrieved', data: summary });
});

export const getMyAttendance = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const memberId = req.user!._id.toString();
  const opts = getPaginationOptions(req);
  const filters = {
    type: req.query.type as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  };
  const { records, meta } = await attendanceService.getMemberAttendance(gymId, memberId, opts, filters);
  sendResponse({ res, statusCode: 200, message: 'Your attendance records retrieved', data: records, meta });
});
