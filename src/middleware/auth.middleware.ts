import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { User } from '../modules/user/user.model';

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token missing');
    }

    const token = authHeader.split(' ')[1];

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded._id).select('-password -refreshToken');

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    req.user = user;
    next();
  }
);
