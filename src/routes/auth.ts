import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware, requireAuth } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Ruta para login
router.post('/login', authController.login);

// Ruta para verificar token
router.post('/verify', authController.verifyToken);

// Ruta para obtener información del usuario actual
router.get('/me', authController.me);

// Ruta para logout
router.post('/logout', authController.logout);

// Ruta para cambiar contraseña (requiere autenticación)
router.post('/change-password', authMiddleware, requireAuth, authController.changePassword);

export default router;
