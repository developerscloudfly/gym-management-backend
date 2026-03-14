import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { p } from '../../utils/param';
import * as classService from './class.service';

export const createClass = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const userId = req.user!._id.toString();
  const gymClass = await classService.createClass(gymId, req.body, userId);
  sendResponse({ res, statusCode: 201, message: 'Class created successfully', data: gymClass });
});

export const getClasses = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const opts = getPaginationOptions(req);
  const filters = {
    status: req.query.status as string | undefined,
    trainerId: req.query.trainerId as string | undefined,
    category: req.query.category as string | undefined,
  };
  const { classes, meta } = await classService.getClasses(gymId, opts, filters);
  sendResponse({ res, statusCode: 200, message: 'Classes retrieved successfully', data: classes, meta });
});

export const getClassById = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const classId = p(req.params.classId);
  const gymClass = await classService.getClassById(gymId, classId);
  sendResponse({ res, statusCode: 200, message: 'Class retrieved successfully', data: gymClass });
});

export const updateClass = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const classId = p(req.params.classId);
  const userId = req.user!._id.toString();
  const gymClass = await classService.updateClass(gymId, classId, req.body, userId);
  sendResponse({ res, statusCode: 200, message: 'Class updated successfully', data: gymClass });
});

export const cancelClass = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const classId = p(req.params.classId);
  const userId = req.user!._id.toString();
  const gymClass = await classService.cancelClass(gymId, classId, userId);
  sendResponse({ res, statusCode: 200, message: 'Class cancelled successfully', data: gymClass });
});

export const enrollMember = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const classId = p(req.params.classId);
  const userId = req.user!._id.toString();
  const memberId = req.body.memberId ?? userId;
  const gymClass = await classService.enrollMember(gymId, classId, memberId, userId);
  sendResponse({ res, statusCode: 200, message: 'Enrolled successfully', data: gymClass });
});

export const unenrollMember = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const classId = p(req.params.classId);
  const userId = req.user!._id.toString();
  const memberId = (req.query.memberId as string) ?? userId;
  const gymClass = await classService.unenrollMember(gymId, classId, memberId, userId);
  sendResponse({ res, statusCode: 200, message: 'Unenrolled successfully', data: gymClass });
});
