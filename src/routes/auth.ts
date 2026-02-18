import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { checkFailedLogins, recordFailedLogin } from '../middleware/rateLimit';

const router = Router();
const authController = new AuthController();

// Ruta para login (con rate limiting solo para intentos FALLIDOS)
router.post('/login', checkFailedLogins, recordFailedLogin, authController.login);

// Ruta para refresh token
router.post('/refresh', authController.refresh);

// Ruta para verificar token
router.post('/verify', authController.verifyToken);

// Ruta para obtener información del usuario actual
router.get('/me', authController.me);

// Ruta para logout
router.post('/logout', authMiddleware, requireAuth, authController.logout);

// Ruta para cambiar contraseña (requiere autenticación)
router.post('/change-password', authMiddleware, requireAuth, authController.changePassword);
export default router;