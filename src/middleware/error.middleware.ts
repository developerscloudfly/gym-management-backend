import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Already a handled ApiError
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors.length ? err.errors : undefined,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Mongoose duplicate key error
  if ((err as NodeJS.ErrnoException).name === 'MongoServerError' && 'code' in err && (err as NodeJS.ErrnoException & { code: number }).code === 11000) {
    const keyValue = (err as NodeJS.ErrnoException & { keyValue: Record<string, unknown> }).keyValue;
    const field = Object.keys(keyValue)[0];
    res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
    return;
  }

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired',
    });
    return;
  }

  // Unknown errors
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Handle 404 — route not found
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};
