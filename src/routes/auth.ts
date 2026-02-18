import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimit';

const router = Router();
const authController = new AuthController();

// Ruta para login (con rate limiting)
router.post('/login', loginLimiter, authController.login);

// Ruta para refresh token
router.post('/refresh', authController.refresh);

// Ruta para verificar token
router.post('/verify', authController.verifyToken);

// Ruta para obtener información del usuario actual
router.get('/me', authController.me);

// Ruta para logout
router.post('/logout', authMiddleware, requireAuth, authController.logout);

export default router;
