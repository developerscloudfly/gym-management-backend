import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { p } from '../../utils/param';
import * as memberService from './member.service';

export const createMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const member = await memberService.createMember(p(req.params.gymId), req.body, req.user!._id);
  sendResponse({ res, statusCode: 201, message: 'Member registered successfully', data: member });
});

export const getMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { members, meta } = await memberService.getMembers(p(req.params.gymId), req);
  sendResponse({ res, message: 'Members fetched', data: members, meta });
});

export const getMemberById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await memberService.getMemberById(p(req.params.gymId), p(req.params.id));
  sendResponse({ res, message: 'Member fetched', data: result });
});

export const updateMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const member = await memberService.updateMember(
    p(req.params.gymId),
    p(req.params.id),
    req.body,
    req.user!._id
  );
  sendResponse({ res, message: 'Member updated successfully', data: member });
});

export const deactivateMember = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await memberService.deactivateMember(p(req.params.gymId), p(req.params.id), req.user!._id);
    sendResponse({ res, message: 'Member deactivated successfully' });
  }
);

// Profile endpoints (used by member themselves via /me)
export const getMyProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const profile = await memberService.getMemberProfile(req.user!._id.toString());
  sendResponse({ res, message: 'Profile fetched', data: profile });
});

export const updateMyProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const profile = await memberService.updateMemberProfile(
      req.user!._id.toString(),
      req.body,
      req.user!._id
    );
    sendResponse({ res, message: 'Profile updated successfully', data: profile });
  }
);

export const addBodyMetric = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const profile = await memberService.addBodyMetric(
    req.user!._id.toString(),
    req.body,
    req.user!._id
  );
  sendResponse({ res, statusCode: 201, message: 'Body metric added', data: profile });
});
