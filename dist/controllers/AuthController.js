"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const AuthService_1 = require("../services/AuthService");
class AuthController {
    constructor() {
        this.login = async (req, res) => {
            try {
                const credentials = req.body;
                if (!credentials.email || !credentials.password) {
                    res.status(400).json({ ok: false, error: 'Email y contraseña son requeridos' });
                    return;
                }
                const result = await this.authService.login(credentials);
                res.status(200).json({ ok: true, data: result });
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Credenciales inválidas') {
                    res.status(401).json({ ok: false, error: error.message });
                }
                else {
                    res.status(500).json({ ok: false, error: 'Error en el servidor', details: error instanceof Error ? error.message : 'Unknown error' });
                }
            }
        };
        this.refresh = async (req, res) => {
            try {
                const refreshToken = req.body?.refreshToken || req.headers.authorization?.replace('Bearer ', '');
                if (!refreshToken) {
                    res.status(401).json({ ok: false, error: 'Refresh token no proporcionado' });
                    return;
                }
                const result = await this.authService.refresh(refreshToken);
                res.status(200).json({ ok: true, data: result });
            }
            catch (error) {
                if (error instanceof Error) {
                    res.status(401).json({ ok: false, error: error.message });
                }
                else {
                    res.status(500).json({ ok: false, error: 'Error en el servidor' });
                }
            }
        };
        this.verifyToken = async (req, res) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    res.status(401).json({ ok: false, error: 'Token no proporcionado' });
                    return;
                }
                const decoded = await this.authService.verifyToken(token);
                res.status(200).json({ ok: true, valid: true, data: decoded });
            }
            catch (error) {
                res.status(401).json({ ok: false, error: 'Token inválido o expirado', valid: false });
            }
        };
        this.me = async (req, res) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    res.status(401).json({ ok: false, error: 'Token no proporcionado' });
                    return;
                }
                const user = await this.authService.getUserFromToken(token);
                if (!user) {
                    res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
                    return;
                }
                // Remover password de la respuesta
                const { password, ...userWithoutPassword } = user;
                res.status(200).json({ ok: true, data: userWithoutPassword });
            }
            catch (error) {
                res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
            }
        };
        this.logout = async (req, res) => {
            try {
                const userId = res.locals?.user?.userId;
                if (!userId) {
                    res.status(401).json({ ok: false, error: 'Authentication required' });
                    return;
                }
                // Revocar todos los refresh tokens del usuario
                await this.authService.logout(userId);
                res.status(200).json({ ok: true, message: 'Logout exitoso' });
            }
            catch (error) {
                res.status(500).json({ ok: false, error: 'Error en el servidor' });
            }
        };
        this.changePassword = async (req, res) => {
            try {
                const userId = res.locals?.user?.userId;
                const { currentPassword, newPassword } = req.body || {};
                if (!userId) {
                    res.status(401).json({ ok: false, error: 'Authentication required' });
                    return;
                }
                if (!currentPassword || !newPassword) {
                    res.status(400).json({ ok: false, error: 'Se requiere contraseña actual y nueva' });
                    return;
                }
                await this.authService.changePassword(userId, currentPassword, newPassword);
                res.status(200).json({ ok: true, message: 'Contraseña actualizada' });
            }
            catch (error) {
                if (error instanceof Error) {
                    res.status(400).json({ ok: false, error: error.message });
                }
                else {
                    res.status(500).json({ ok: false, error: 'Error en el servidor' });
                }
            }
        };
        this.authService = new AuthService_1.AuthService();
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map