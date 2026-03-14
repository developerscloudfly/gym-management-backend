import { Request } from 'express';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const getPaginationOptions = (req: Request): PaginationOptions => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const buildPaginationMeta = (
  total: number,
  options: PaginationOptions
): PaginationMeta => ({
  page: options.page,
  limit: options.limit,
  total,
  totalPages: Math.ceil(total / options.limit),
});
