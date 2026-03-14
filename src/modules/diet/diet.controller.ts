import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { p } from '../../utils/param';
import * as dietService from './diet.service';

export const createDietPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const plan = await dietService.createDietPlan(p(req.params.gymId), req.body, req.user!._id);
  sendResponse({ res, statusCode: 201, message: 'Diet plan created', data: plan });
});

export const getDietPlans = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { plans, meta } = await dietService.getDietPlans(p(req.params.gymId), req);
  sendResponse({ res, message: 'Diet plans fetched', data: plans, meta });
});

export const getDietPlanById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const plan = await dietService.getDietPlanById(p(req.params.gymId), p(req.params.id));
  sendResponse({ res, message: 'Diet plan fetched', data: plan });
});

export const getMyDietPlans = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const plans = await dietService.getMyDietPlans(
    req.user!._id.toString(),
    req.user!.gymId!.toString()
  );
  sendResponse({ res, message: 'My diet plans fetched', data: plans });
});

export const updateDietPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const plan = await dietService.updateDietPlan(
    p(req.params.gymId),
    p(req.params.id),
    req.body,
    req.user!._id
  );
  sendResponse({ res, message: 'Diet plan updated', data: plan });
});

export const assignDietPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const plan = await dietService.assignDietPlan(
    p(req.params.gymId),
    p(req.params.id),
    req.body,
    req.user!._id
  );
  sendResponse({ res, message: 'Diet plan assigned', data: plan });
});

export const deleteDietPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await dietService.deleteDietPlan(p(req.params.gymId), p(req.params.id), req.user!._id);
  sendResponse({ res, message: 'Diet plan archived' });
});
