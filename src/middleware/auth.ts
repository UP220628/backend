import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';

// Middleware que verifica JWT Bearer token
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization as string | undefined;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      try {
        const payload = jwt.verify(token, env.jwtSecret) as any;
        // payload is expected to include { userId, email, roleId, providerId }
        res.locals.user = {
          userId: payload.userId,
          email: payload.email,
          roleId: payload.roleId,
          providerId: payload.providerId,
        };
        return next();
      } catch (err: any) {
        return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
      }
    }

    return next();
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: 'Authentication middleware failed' });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!res.locals || !(res.locals as any).user) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }
  return next();
}

export default {};
