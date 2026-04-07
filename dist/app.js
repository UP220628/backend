"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const crypto_1 = require("crypto");
const environment_1 = require("./config/environment");
const health_1 = __importDefault(require("./routes/health"));
const units_1 = __importDefault(require("./routes/units"));
const logs_1 = __importDefault(require("./routes/logs"));
const providers_1 = __importDefault(require("./routes/providers"));
const users_1 = __importDefault(require("./routes/users"));
const auth_1 = __importDefault(require("./routes/auth"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const events_1 = __importDefault(require("./routes/events"));
const auth_2 = require("./middleware/auth");
const rateLimit_1 = require("./middleware/rateLimit");
const notificationHub_1 = require("./realtime/notificationHub");
const app = (0, express_1.default)();
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
// CORS restringido a orígenes autorizados
const corsOptions = {
    origin: environment_1.env.corsOrigin.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id'],
    maxAge: 86400,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
app.use((req, res, next) => {
    const headerRequestId = req.header('x-request-id');
    const requestId = headerRequestId && headerRequestId.trim() ? headerRequestId : (0, crypto_1.randomUUID)();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
});
// Security headers para HTTPS
app.use((req, res, next) => {
    if (environment_1.env.useHttps || req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
// Rate limiting general
app.use(rateLimit_1.apiLimiter);
// Rutas públicas (sin autenticación)
app.use('/auth', auth_1.default);
// Autenticación JWT (si está configurada) o fallback a header `x-user-role` en desarrollo
app.use(auth_2.authMiddleware);
app.use('/health', health_1.default);
app.use('/units', units_1.default);
app.use('/logs', logs_1.default);
app.use('/providers', providers_1.default);
app.use('/users', users_1.default);
app.use('/dashboard', dashboard_1.default);
app.use('/notifications', notifications_1.default);
app.use('/events', events_1.default);
app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'body-app-backend' });
});
app.use((req, res) => {
    const requestId = res.locals?.requestId;
    return res.status(404).json({ ok: false, error: 'Not found', requestId });
});
app.use((err, req, res, _next) => {
    const requestId = res.locals?.requestId;
    const detail = sanitizeErrorDetail(err);
    console.error('Unhandled error requestId=%s method=%s path=%s detail=%s', requestId, req.method, req.originalUrl, detail);
    return res.status(500).json({
        ok: false,
        error: 'Internal server error',
        requestId,
    });
});
if (require.main === module) {
    let server;
    if (environment_1.env.useHttps) {
        // Para HTTPS se requiere certificados
        console.warn('USE_HTTPS está habilitado pero no se configuraron certificados. Usando HTTP.');
        server = http_1.default.createServer(app);
    }
    else {
        server = http_1.default.createServer(app);
    }
    (0, notificationHub_1.initNotificationHub)(server);
    server.listen(environment_1.env.port, () => {
        console.log(`API listening on http${environment_1.env.useHttps ? 's' : ''}://localhost:${environment_1.env.port}`);
    });
}
exports.default = app;
//# sourceMappingURL=app.js.map