import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler to catch errors and return a consistent
 * `{ ok: false, error }` response, eliminating repetitive try/catch blocks.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch((err: any) => {
      res.status(500).json({ ok: false, error: err.message ?? 'Internal server error' });
    });
