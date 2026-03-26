import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { p } from '../../utils/param';
import * as analyticsService from './analytics.service';

export const getSuperAdminDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const data = await analyticsService.getSuperAdminDashboard();
  sendResponse({ res, statusCode: 200, message: 'Super admin dashboard retrieved', data });
});

// Kept for backward compatibility
export const getPlatformAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const data = await analyticsService.getPlatformAnalytics();
  sendResponse({ res, statusCode: 200, message: 'Platform analytics retrieved', data });
});

export const getGymAdminDashboard = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const data = await analyticsService.getGymAdminDashboard(gymId);
  sendResponse({ res, statusCode: 200, message: 'Gym admin dashboard retrieved', data });
});

export const getTrainerDashboard = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const trainerId = p(req.params.trainerId);
  const data = await analyticsService.getTrainerDashboard(gymId, trainerId);
  sendResponse({ res, statusCode: 200, message: 'Trainer dashboard retrieved', data });
});

export const getStaffDashboard = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const data = await analyticsService.getStaffDashboard(gymId);
  sendResponse({ res, statusCode: 200, message: 'Staff dashboard retrieved', data });
});

export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const from = req.query.from ? new Date(req.query.from as string) : threeMonthsAgo;
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  const groupBy = (req.query.groupBy as 'day' | 'month') ?? 'month';

  const data = await analyticsService.getRevenueAnalytics(gymId, from, to, groupBy);
  sendResponse({ res, statusCode: 200, message: 'Revenue analytics retrieved', data });
});

export const getMemberAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const from = req.query.from ? new Date(req.query.from as string) : threeMonthsAgo;
  const to = req.query.to ? new Date(req.query.to as string) : new Date();

  const data = await analyticsService.getMemberAnalytics(gymId, from, to);
  sendResponse({ res, statusCode: 200, message: 'Member analytics retrieved', data });
});

export const getMemberDashboard = asyncHandler(async (req: Request, res: Response) => {
  const memberId = req.user!._id.toString();
  const gymId = req.user!.gymId?.toString() ?? '';
  const data = await analyticsService.getMemberDashboard(memberId, gymId);
  sendResponse({ res, statusCode: 200, message: 'Member dashboard retrieved', data });
});

export const getMyProgressAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const memberId = req.user!._id.toString();
  const gymId = req.user!.gymId?.toString() ?? '';
  const data = await analyticsService.getMemberProgressAnalytics(memberId, gymId);
  sendResponse({ res, statusCode: 200, message: 'Progress analytics retrieved', data });
});
