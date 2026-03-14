import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { p } from '../../utils/param';
import * as subscriptionService from './subscription.service';

// ─── Plans ────────────────────────────────────────────────────────────────────

export const createPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const plan = await subscriptionService.createPlan(p(req.params.gymId), req.body, req.user!._id);
  sendResponse({ res, statusCode: 201, message: 'Plan created successfully', data: plan });
});

export const getPlans = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { plans, meta } = await subscriptionService.getPlans(p(req.params.gymId), req);
  sendResponse({ res, message: 'Plans fetched', data: plans, meta });
});

export const updatePlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const plan = await subscriptionService.updatePlan(
    p(req.params.gymId),
    p(req.params.planId),
    req.body,
    req.user!._id
  );
  sendResponse({ res, message: 'Plan updated successfully', data: plan });
});

export const deactivatePlan = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await subscriptionService.deactivatePlan(p(req.params.gymId), p(req.params.planId), req.user!._id);
    sendResponse({ res, message: 'Plan deactivated successfully' });
  }
);

// ─── Member Subscriptions ─────────────────────────────────────────────────────

export const assignSubscription = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const sub = await subscriptionService.assignSubscription(
      p(req.params.gymId),
      req.body,
      req.user!._id
    );
    sendResponse({ res, statusCode: 201, message: 'Subscription assigned successfully', data: sub });
  }
);

export const getMemberSubscriptions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { subscriptions, meta } = await subscriptionService.getMemberSubscriptions(
      p(req.params.gymId),
      p(req.params.memberId),
      req
    );
    sendResponse({ res, message: 'Subscriptions fetched', data: subscriptions, meta });
  }
);

export const getMyActiveSubscription = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const sub = await subscriptionService.getActiveSubscription(
      req.user!.gymId!.toString(),
      req.user!._id.toString()
    );
    sendResponse({ res, message: 'Active subscription fetched', data: sub });
  }
);

export const cancelSubscription = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const sub = await subscriptionService.cancelSubscription(
      p(req.params.subscriptionId),
      req.body,
      req.user!._id
    );
    sendResponse({ res, message: 'Subscription cancelled', data: sub });
  }
);
