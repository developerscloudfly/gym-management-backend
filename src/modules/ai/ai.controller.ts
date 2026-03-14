import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { p } from '../../utils/param';
import * as aiService from './ai.service';

export const generateWorkout = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const trainerId = req.user!._id.toString();
  const { memberId, durationWeeks, daysPerWeek, additionalNotes } = req.body as {
    memberId: string;
    durationWeeks?: number;
    daysPerWeek?: number;
    additionalNotes?: string;
  };
  const plan = await aiService.generateWorkoutPlan(memberId, gymId, trainerId, {
    durationWeeks,
    daysPerWeek,
    additionalNotes,
  });
  sendResponse({ res, statusCode: 201, message: 'AI workout plan generated', data: plan });
});

export const generateDiet = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const trainerId = req.user!._id.toString();
  const { memberId, targetCalories, additionalNotes } = req.body as {
    memberId: string;
    targetCalories?: number;
    additionalNotes?: string;
  };
  const plan = await aiService.generateDietPlan(memberId, gymId, trainerId, {
    targetCalories,
    additionalNotes,
  });
  sendResponse({ res, statusCode: 201, message: 'AI diet plan generated', data: plan });
});

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const memberId = req.user!._id.toString();
  const gymId = req.body.gymId as string;
  const message = req.body.message as string;
  const result = await aiService.chat(memberId, gymId, message);
  sendResponse({ res, statusCode: 200, message: 'Chat response', data: result });
});

export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const memberId = req.user!._id.toString();
  const gymId = req.query.gymId as string;
  const messages = await aiService.getChatHistory(memberId, gymId);
  sendResponse({ res, statusCode: 200, message: 'Chat history retrieved', data: messages });
});

export const clearChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const memberId = req.user!._id.toString();
  const gymId = req.body.gymId as string;
  await aiService.clearChatHistory(memberId, gymId);
  sendResponse({ res, statusCode: 200, message: 'Chat history cleared', data: null });
});

export const scanFood = asyncHandler(async (req: Request, res: Response) => {
  const { imageBase64 } = req.body as { imageBase64: string };
  const result = await aiService.scanFood(imageBase64);
  sendResponse({ res, statusCode: 200, message: 'Food analysis complete', data: result });
});

export const getProgressInsights = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const memberId = p(req.params.memberId);
  const insights = await aiService.getProgressInsights(memberId, gymId);
  sendResponse({ res, statusCode: 200, message: 'Progress insights retrieved', data: insights });
});

export const getMyProgressInsights = asyncHandler(async (req: Request, res: Response) => {
  const memberId = req.user!._id.toString();
  const gymId = req.query.gymId as string;
  const insights = await aiService.getProgressInsights(memberId, gymId);
  sendResponse({ res, statusCode: 200, message: 'Progress insights retrieved', data: insights });
});

export const getChurnPrediction = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const result = await aiService.getChurnPrediction(gymId);
  sendResponse({ res, statusCode: 200, message: 'Churn prediction retrieved', data: result });
});

export const getCrowdPrediction = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const result = await aiService.getCrowdPrediction(gymId);
  sendResponse({ res, statusCode: 200, message: 'Crowd prediction retrieved', data: result });
});
