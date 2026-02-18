import express from 'express';
import http from 'http';
import https from 'https';
import cors from 'cors';
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

// CORS restringido a orígenes autorizados
const corsOptions = {
  origin: env.corsOrigin.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
