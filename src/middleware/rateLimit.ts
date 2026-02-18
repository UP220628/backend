import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiting para login: máximo 5 intentos en 15 minutos por IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: 'Demasiados intentos de login fallidos. Intenta de nuevo en 15 minutos.',
  standardHeaders: true, // Retorna limite en headers RateLimit-*
  legacyHeaders: false, // Desactiva X-RateLimit-* headers
  skip: (req: any) => {
    // En desarrollo, skip rate limiting si hay header especial
    return process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit'] === 'true';
  },
  keyGenerator: (req: any) => {
    // Usar IP del cliente (soporta proxies con X-Forwarded-For)
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  handler: (req: any, res: any) => {
    res.status(429).json({
      ok: false,
      error: 'Demasiados intentos de login. Intenta más tarde.',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Rate limiting general para API: máximo 100 requests por minuto
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => {
    return process.env.NODE_ENV === 'development';
  },
});

// Rate limiting estricto para rutas sensibles: máximo 10 en 1 hora
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
