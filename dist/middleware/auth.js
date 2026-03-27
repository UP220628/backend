"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
function sanitizeErrorDetail(value) {
    let message = String(value ?? '');
    const replacements = [
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
function getRequestId(req, res) {
    return res.locals?.requestId || req.header('x-request-id') || 'unknown';
}
// Middleware que verifica JWT Bearer token
function authMiddleware(req, res, next) {
    try {
        const requestId = getRequestId(req, res);
        const auth = req.headers.authorization;
        if (auth && auth.toLowerCase().startsWith('bearer ')) {
            const token = auth.slice(7).trim();
            try {
                const payload = jsonwebtoken_1.default.verify(token, environment_1.env.jwtSecret);
                // payload is expected to include { userId, email, roleId, providerId, plant }
                res.locals.user = {
                    userId: payload.userId,
                    email: payload.email,
                    roleId: payload.roleId,
                    providerId: payload.providerId,
                    plant: payload.plant,
                };
                return next();
            }
            catch (err) {
                console.warn('Auth failed requestId=%s method=%s path=%s detail=%s', requestId, req.method, req.originalUrl, sanitizeErrorDetail(err?.message ?? err));
                return res.status(401).json({ ok: false, error: 'Invalid or expired token', requestId });
            }
        }
        return next();
    }
    catch (err) {
        const requestId = getRequestId(req, res);
        console.error('Auth middleware failed requestId=%s method=%s path=%s detail=%s', requestId, req.method, req.originalUrl, sanitizeErrorDetail(err?.message ?? err));
        return res.status(500).json({ ok: false, error: 'Authentication middleware failed', requestId });
    }
}
function requireAuth(req, res, next) {
    if (!res.locals || !res.locals.user) {
        return res.status(401).json({ ok: false, error: 'Authentication required', requestId: getRequestId(req, res) });
    }
    return next();
}
exports.default = {};
//# sourceMappingURL=auth.js.map