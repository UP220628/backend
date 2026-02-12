import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware que intenta popular res.locals.user a partir de JWT Bearer token.
// Si no hay token, permite usar header `x-user-role` para desarrollo/testing.
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization as string | undefined;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      if (!JWT_SECRET) {
        return res.status(500).json({ ok: false, error: 'JWT_SECRET not configured on server' });
      }
      try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        // payload is expected to include { userId, email, roleId, providerId }
        res.locals.user = {
          userId: payload.userId,
          email: payload.email,
          roleId: payload.roleId,
          providerId: payload.providerId,
        };
        return next();
      } catch (err: any) {
        return res.status(401).json({ ok: false, error: 'Invalid token' });
      }
    }

    // Fallback: allow `x-user-role` header for quick testing (not secure)
    const headerRole = (req.headers['x-user-role'] as string) || undefined;
    if (headerRole) {
      res.locals.user = { roleName: headerRole } as any;
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
