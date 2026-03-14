import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { p } from '../../utils/param';
import * as analyticsService from './analytics.service';

export const getPlatformAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const data = await analyticsService.getPlatformAnalytics();
  sendResponse({ res, statusCode: 200, message: 'Platform analytics retrieved', data });
});

export const getGymDashboard = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const data = await analyticsService.getGymDashboard(gymId);
  sendResponse({ res, statusCode: 200, message: 'Gym dashboard retrieved', data });
});

export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
  const data = await analyticsService.getRevenueAnalytics(gymId, months);
  sendResponse({ res, statusCode: 200, message: 'Revenue analytics retrieved', data });
});

export const getMemberAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const data = await analyticsService.getMemberAnalytics(gymId);
  sendResponse({ res, statusCode: 200, message: 'Member analytics retrieved', data });
});

export const getMyProgressAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const memberId = req.user!._id.toString();
  const gymId = req.user!.gymId?.toString() ?? '';
  const data = await analyticsService.getMemberProgressAnalytics(memberId, gymId);
  sendResponse({ res, statusCode: 200, message: 'Progress analytics retrieved', data });
});
