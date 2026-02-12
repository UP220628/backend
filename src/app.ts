import express from 'express';
import http from 'http';
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
import { initNotificationHub } from './realtime/notificationHub';

const app = express();

app.use(cors());
app.use(express.json());

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
	const server = http.createServer(app);
	initNotificationHub(server);

	server.listen(env.port, () => {
		console.log(`API listening on http://localhost:${env.port}`);
	});
}

export default app;
