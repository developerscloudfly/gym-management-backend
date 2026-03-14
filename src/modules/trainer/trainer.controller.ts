import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { p } from '../../utils/param';
import * as trainerService from './trainer.service';

// ─── Trainers ─────────────────────────────────────────────────────────────────

export const createTrainer = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const trainer = await trainerService.createTrainer(p(req.params.gymId), req.body, req.user!._id);
    sendResponse({ res, statusCode: 201, message: 'Trainer added successfully', data: trainer });
  }
);

export const getTrainers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { users, meta } = await trainerService.getTrainers(p(req.params.gymId), req);
  sendResponse({ res, message: 'Trainers fetched', data: users, meta });
});

export const updateTrainer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const trainer = await trainerService.updateTrainer(
    p(req.params.gymId),
    p(req.params.id),
    req.body,
    req.user!._id
  );
  sendResponse({ res, message: 'Trainer updated successfully', data: trainer });
});

export const deactivateTrainer = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await trainerService.deactivateTrainer(p(req.params.gymId), p(req.params.id), req.user!._id);
    sendResponse({ res, message: 'Trainer deactivated successfully' });
  }
);

// ─── Staff ────────────────────────────────────────────────────────────────────

export const createStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const staff = await trainerService.createStaff(p(req.params.gymId), req.body, req.user!._id);
  sendResponse({ res, statusCode: 201, message: 'Staff added successfully', data: staff });
});

export const getStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { users, meta } = await trainerService.getStaff(p(req.params.gymId), req);
  sendResponse({ res, message: 'Staff fetched', data: users, meta });
});

export const updateStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const staff = await trainerService.updateStaff(
    p(req.params.gymId),
    p(req.params.id),
    req.body,
    req.user!._id
  );
  sendResponse({ res, message: 'Staff updated successfully', data: staff });
});

export const deactivateStaff = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await trainerService.deactivateStaff(p(req.params.gymId), p(req.params.id), req.user!._id);
    sendResponse({ res, message: 'Staff deactivated successfully' });
  }
);
