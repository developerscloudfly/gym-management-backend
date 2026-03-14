import { Response } from 'express';

interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: number;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendResponse = <T>({
  res,
  statusCode = 200,
  message,
  data,
  meta,
}: ApiResponseOptions<T>): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
    ...(meta && { meta }),
  });
};
