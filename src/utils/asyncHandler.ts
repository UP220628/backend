import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers and forwards failures to Express error middleware,
 * which centralizes sanitization and response formatting.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
