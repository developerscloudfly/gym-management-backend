import { Request, Response, NextFunction } from 'express';
import { z, ZodTypeAny } from 'zod';
import { ApiError } from '../utils/apiError';

type RequestPart = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodTypeAny, part: RequestPart = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const errors = result.error.issues.map(
        (issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`
      );
      throw ApiError.badRequest('Validation failed', errors);
    }

    // Replace with parsed/coerced data
    req[part] = result.data;
    next();
  };
