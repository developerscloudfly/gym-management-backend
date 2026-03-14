import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { p } from '../../utils/param';
import * as workoutService from './workout.service';

export const createWorkoutPlan = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const plan = await workoutService.createWorkoutPlan(p(req.params.gymId), req.body, req.user!._id);
    sendResponse({ res, statusCode: 201, message: 'Workout plan created', data: plan });
  }
);

export const getWorkoutPlans = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { plans, meta } = await workoutService.getWorkoutPlans(p(req.params.gymId), req);
  sendResponse({ res, message: 'Workout plans fetched', data: plans, meta });
});

export const getWorkoutPlanById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const plan = await workoutService.getWorkoutPlanById(p(req.params.gymId), p(req.params.id));
    sendResponse({ res, message: 'Workout plan fetched', data: plan });
  }
);

export const getMyWorkoutPlans = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const plans = await workoutService.getMyWorkoutPlans(
      req.user!._id.toString(),
      req.user!.gymId!.toString()
    );
    sendResponse({ res, message: 'My workout plans fetched', data: plans });
  }
);

export const updateWorkoutPlan = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const plan = await workoutService.updateWorkoutPlan(
      p(req.params.gymId),
      p(req.params.id),
      req.body,
      req.user!._id
    );
    sendResponse({ res, message: 'Workout plan updated', data: plan });
  }
);

export const assignWorkoutPlan = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const plan = await workoutService.assignWorkoutPlan(
      p(req.params.gymId),
      p(req.params.id),
      req.body,
      req.user!._id
    );
    sendResponse({ res, message: 'Workout plan assigned', data: plan });
  }
);

export const deleteWorkoutPlan = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await workoutService.deleteWorkoutPlan(p(req.params.gymId), p(req.params.id), req.user!._id);
    sendResponse({ res, message: 'Workout plan archived' });
  }
);
