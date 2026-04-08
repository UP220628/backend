import express from 'express';
import http from 'http';
import https from 'https';
import cors, { CorsOptions } from 'cors';
import { randomUUID } from 'crypto';
import { env } from './config/environment';
import healthRouter from './routes/health';
import unitsRouter from './routes/units';
import logsRouter from './routes/logs';
import providersRouter from './routes/providers';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import notificationsRouter from './routes/notifications';
import eventsRouter from './routes/events';
import { authMiddleware } from './middleware/auth';
import { apiLimiter } from './middleware/rateLimit';
import { initNotificationHub } from './realtime/notificationHub';

const app = express();

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

const configuredCorsOrigins = env.corsOrigin
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

const defaultLocalOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedCorsOrigins = Array.from(new Set([...configuredCorsOrigins, ...defaultLocalOrigins]));

function isOriginAllowed(origin: string): boolean {
	if (allowedCorsOrigins.includes('*')) {
		return true;
	}

	if (allowedCorsOrigins.includes(origin)) {
		return true;
	}

	try {
		const parsedOrigin = new URL(origin);
		return (
			(parsedOrigin.hostname === 'localhost' || parsedOrigin.hostname === '127.0.0.1') &&
			(parsedOrigin.protocol === 'http:' || parsedOrigin.protocol === 'https:')
		);
	} catch {
		return false;
	}
}

const corsOptions: CorsOptions = {
	origin: (origin, callback) => {
		// Allow requests with no Origin header (curl, health checks, server-to-server).
		if (!origin) {
			return callback(null, true);
		}

		if (isOriginAllowed(origin)) {
			return callback(null, true);
		}

		console.warn('CORS blocked origin=%s allowedOrigins=%s', origin, allowedCorsOrigins.join(','));
		return callback(null, false);
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id'],
	maxAge: 86400,
	optionsSuccessStatus: 204,
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
	const headerRequestId = req.header('x-request-id');
	const requestId = headerRequestId && headerRequestId.trim() ? headerRequestId : randomUUID();
	(res.locals as any).requestId = requestId;
	res.setHeader('X-Request-Id', requestId);
	next();
});

// Security headers para HTTPS
app.use((req, res, next) => {
  if (env.useHttps || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting general
app.use(apiLimiter);

// Rutas públicas (sin autenticación)
app.use('/auth', authRouter);

// Autenticación JWT (si está configurada) o fallback a header `x-user-role` en desarrollo
app.use(authMiddleware);

app.use('/health', healthRouter);
app.use('/units', unitsRouter);
app.use('/logs', logsRouter);
app.use('/providers', providersRouter);
app.use('/users', usersRouter);
app.use('/dashboard', dashboardRouter);
app.use('/notifications', notificationsRouter);
app.use('/events', eventsRouter);

app.get('/', (_req, res) => {
	res.json({ ok: true, service: 'body-app-backend' });
});

app.use((req: express.Request, res: express.Response) => {
	const requestId = (res.locals as any)?.requestId;
	return res.status(404).json({ ok: false, error: 'Not found', requestId });
});

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
	const requestId = (res.locals as any)?.requestId;
	const detail = sanitizeErrorDetail(err);
	console.error(
		'Unhandled error requestId=%s method=%s path=%s detail=%s',
		requestId,
		req.method,
		req.originalUrl,
		detail
	);

	return res.status(500).json({
		ok: false,
		error: 'Internal server error',
		requestId,
	});
});

if (require.main === module) {
	let server: http.Server;

	if (env.useHttps) {
		// Para HTTPS se requiere certificados
		console.warn('USE_HTTPS está habilitado pero no se configuraron certificados. Usando HTTP.');
		server = http.createServer(app);
	} else {
		server = http.createServer(app);
	}

	initNotificationHub(server);

	server.listen(env.port, () => {
		console.log(`API listening on http${env.useHttps ? 's' : ''}://localhost:${env.port}`);
	});
}

export default app;
