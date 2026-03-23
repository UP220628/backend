import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';

function sanitizeErrorDetail(value: unknown): string {
  let message = String(value ?? '');
  const replacements: Array<[RegExp, string]> = [
    [/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]'],
    [/(authorization\s*[:=]\s*)([^,\s]+)/gi, '$1[REDACTED]'],
    [/(password\s*[:=]\s*)([^,\s]+)/gi, '$1[REDACTED]'],
    [/(token\s*[:=]\s*)([^,\s]+)/gi, '$1[REDACTED]'],
    [/(jwt_secret\s*[:=]\s*)([^,\s]+)/gi, '$1[REDACTED]'],
    [/(database_url\s*[:=]\s*)([^,\s]+)/gi, '$1[REDACTED]'],
  ];

  for (const [pattern, replacement] of replacements) {
    message = message.replace(pattern, replacement);
  }

  return message;
}

function getRequestId(req: Request, res: Response): string {
  return ((res.locals as any)?.requestId as string) || (req.header('x-request-id') as string) || 'unknown';
}

// Middleware que verifica JWT Bearer token
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const requestId = getRequestId(req, res);
    const auth = req.headers.authorization as string | undefined;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      try {
        const payload = jwt.verify(token, env.jwtSecret) as any;
        // payload is expected to include { userId, email, roleId, providerId, plant }
        res.locals.user = {
          userId: payload.userId,
          email: payload.email,
          roleId: payload.roleId,
          providerId: payload.providerId,
          plant: payload.plant,
        };
        return next();
      } catch (err: any) {
        console.warn(
          'Auth failed requestId=%s method=%s path=%s detail=%s',
          requestId,
          req.method,
          req.originalUrl,
          sanitizeErrorDetail(err?.message ?? err)
        );
        return res.status(401).json({ ok: false, error: 'Invalid or expired token', requestId });
      }
    }

    return next();
  } catch (err: any) {
    const requestId = getRequestId(req, res);
    console.error(
      'Auth middleware failed requestId=%s method=%s path=%s detail=%s',
      requestId,
      req.method,
      req.originalUrl,
      sanitizeErrorDetail(err?.message ?? err)
    );
    return res.status(500).json({ ok: false, error: 'Authentication middleware failed', requestId });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!res.locals || !(res.locals as any).user) {
    return res.status(401).json({ ok: false, error: 'Authentication required', requestId: getRequestId(req, res) });
  }
  return next();
}

export default {};
