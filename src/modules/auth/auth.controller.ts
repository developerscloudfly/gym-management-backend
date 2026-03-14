import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import * as authService from './auth.service';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.registerUser(req.body);

  res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

  sendResponse({
    res,
    statusCode: 201,
    message: 'Registration successful',
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.loginUser(req.body);

  res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

  sendResponse({
    res,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Accept token from cookie or body
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    throw ApiError.unauthorized('Refresh token missing');
  }

  const tokens = await authService.refreshTokens(token);

  res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

  sendResponse({
    res,
    message: 'Tokens refreshed',
    data: { accessToken: tokens.accessToken },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.logoutUser(req.user!._id.toString());

  res.clearCookie('refreshToken');

  sendResponse({ res, message: 'Logged out successfully' });
});

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // TODO: send email — capture token when SMTP is configured
    // const resetToken = await authService.forgotPassword(req.body);
    // await sendPasswordResetEmail(req.body.email, resetToken);
    await authService.forgotPassword(req.body);

    // Always return 200 to prevent email enumeration
    sendResponse({
      res,
      message: 'If that email exists, a password reset link has been sent',
    });
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await authService.resetPassword(req.body);

    res.clearCookie('refreshToken');

    sendResponse({ res, message: 'Password reset successful. Please login again.' });
  }
);

export const getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getMe(req.user!._id.toString());

  sendResponse({ res, message: 'Profile fetched', data: user });
});
