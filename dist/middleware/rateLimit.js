"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictLimiter = exports.apiLimiter = void 0;
exports.checkFailedLogins = checkFailedLogins;
exports.recordFailedLogin = recordFailedLogin;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Contador en memoria para intentos fallidos por IP
const failedAttempts = new Map();
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
function checkFailedLogins(req, res, next) {
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
function recordFailedLogin(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    // Store original json para interceptar la respuesta
    const originalJson = res.json.bind(res);
    res.json = function (data) {
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
        }
        else {
            attempts.count += 1;
            attempts.resetTime = now + FAILED_ATTEMPT_WINDOW; // Resetear ventana
        }
        return originalJson(data);
    };
    next();
}
// Rate limiting general para API: máximo 100 requests por minuto
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // máximo 100 requests
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development';
    },
});
// Rate limiting estricto para rutas sensibles: máximo 10 en 1 hora
exports.strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimit.js.map