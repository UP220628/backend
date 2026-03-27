"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
const authController = new AuthController_1.AuthController();
// Ruta para login (con rate limiting solo para intentos FALLIDOS)
router.post('/login', rateLimit_1.checkFailedLogins, rateLimit_1.recordFailedLogin, authController.login);
// Ruta para refresh token
router.post('/refresh', authController.refresh);
// Ruta para verificar token
router.post('/verify', authController.verifyToken);
// Ruta para obtener información del usuario actual
router.get('/me', authController.me);
// Ruta para logout
router.post('/logout', auth_1.authMiddleware, auth_1.requireAuth, authController.logout);
// Ruta para cambiar contraseña (requiere autenticación)
router.post('/change-password', auth_1.authMiddleware, auth_1.requireAuth, authController.changePassword);
exports.default = router;
//# sourceMappingURL=auth.js.map