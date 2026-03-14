import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../modules/user/user.model';
import { ApiError } from '../utils/apiError';

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Role '${req.user.role}' is not allowed to access this resource`
      );
    }

    next();
  };
};

// Ensure the user belongs to the gym in the route param
export const belongsToGym = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  // Super admin can access any gym
  if (req.user.role === 'super_admin') {
    return next();
  }

  const gymId = req.params.gymId;

  if (!gymId) {
    return next();
  }

  if (req.user.gymId?.toString() !== gymId) {
    throw ApiError.forbidden('You do not have access to this gym');
  }

  next();
};
