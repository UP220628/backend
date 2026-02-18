import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Contador en memoria para intentos fallidos por IP
const failedAttempts = new Map<string, { count: number; resetTime: number }>();
const FAILED_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutos
const MAX_FAILED_ATTEMPTS = 5;

// Limpiar intentos expirados cada minuto
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of failedAttempts.entries()) {
    if (now > data.resetTime) {
      failedAttempts.delete(ip);
    }
  }
}, 60 * 1000);

export function checkFailedLogins(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // En desarrollo, permitir
  if (process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit'] === 'true') {
    return next();
  }

  const attempts = failedAttempts.get(ip);
  const now = Date.now();

  if (attempts && now < attempts.resetTime && attempts.count >= MAX_FAILED_ATTEMPTS) {
    const timeLeft = Math.ceil((attempts.resetTime - now) / 1000 / 60);
    return res.status(429).json({
      ok: false,
      error: `Demasiados intentos de login fallidos. Intenta de nuevo en ${timeLeft} minutos.`,
    });
  }

  next();
}

export function recordFailedLogin(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // Store original json para interceptar la respuesta
  const originalJson = res.json.bind(res);

  res.json = function(data: any) {
    // Si fue login exitoso (ok: true), no contar como intento fallido
    if (data && data.ok === true) {
      // Limpiar intentos fallidos previos de esta IP
      failedAttempts.delete(ip);
      return originalJson(data);
    }

    // Si fue login fallido (ok: false o sin ok), contar intento
    const attempts = failedAttempts.get(ip);
    
    if (!attempts) {
      failedAttempts.set(ip, {
        count: 1,
        resetTime: now + FAILED_ATTEMPT_WINDOW,
      });
    } else {
      attempts.count += 1;
      attempts.resetTime = now + FAILED_ATTEMPT_WINDOW; // Resetear ventana
    }

    return originalJson(data);
  };

  next();
}

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
