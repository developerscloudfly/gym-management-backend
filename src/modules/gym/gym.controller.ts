import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { p } from '../../utils/param';
import * as gymService from './gym.service';

export const createGym = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const gym = await gymService.createGym(req.body, req.user!._id, req.user!._id);

  sendResponse({ res, statusCode: 201, message: 'Gym created successfully', data: gym });
});

export const getAllGyms = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { gyms, meta } = await gymService.getAllGyms(req);

  sendResponse({ res, message: 'Gyms fetched', data: gyms, meta });
});

export const getGymById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const gym = await gymService.getGymById(p(req.params.id));

  sendResponse({ res, message: 'Gym fetched', data: gym });
});

export const updateGym = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const gym = await gymService.updateGym(p(req.params.id), req.body, req.user!._id);

  sendResponse({ res, message: 'Gym updated successfully', data: gym });
});

export const deactivateGym = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await gymService.deactivateGym(p(req.params.id), req.user!._id);

    sendResponse({ res, message: 'Gym deactivated successfully' });
  }
);
