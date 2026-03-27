"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserRepository_1 = require("../repositories/UserRepository");
const RefreshTokenRepository_1 = require("../repositories/RefreshTokenRepository");
const environment_1 = require("../config/environment");
const constants_1 = require("../constants");
class AuthService {
    constructor() {
        this.userRepository = new UserRepository_1.UserRepository();
        this.refreshTokenRepository = new RefreshTokenRepository_1.RefreshTokenRepository();
        this.jwtSecret = environment_1.env.jwtSecret;
        this.jwtExpiresIn = environment_1.env.jwtExpiresIn;
        this.refreshTokenExpiresIn = environment_1.env.refreshTokenExpiresIn;
        // env.jwtSecret already validates via required() — no redundant check needed
    }
    // Generar tokens
    generateAccessToken(user) {
        return jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            roleId: user.roleId,
            providerId: user.providerId,
            plant: user.plant,
        }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
    }
    generateRefreshToken() {
        return jsonwebtoken_1.default.sign({ type: 'refresh' }, this.jwtSecret, { expiresIn: this.refreshTokenExpiresIn });
    }
    parseExpiration(expiresIn) {
        const now = new Date();
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match)
            throw new Error('Invalid expiration format');
        const [, amount, unit] = match;
        const num = parseInt(amount);
        switch (unit) {
            case 's':
                now.setSeconds(now.getSeconds() + num);
                break;
            case 'm':
                now.setMinutes(now.getMinutes() + num);
                break;
            case 'h':
                now.setHours(now.getHours() + num);
                break;
            case 'd':
                now.setDate(now.getDate() + num);
                break;
        }
        return now;
    }
    async login(credentials) {
        const { email, password } = credentials;
        // Buscar usuario por email
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Credenciales inválidas');
        }
        // Verificar contraseña
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Credenciales inválidas');
        }
        // Generar tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken();
        const expiresAt = this.parseExpiration(this.refreshTokenExpiresIn);
        // Guardar refresh token en BD
        await this.refreshTokenRepository.create(user.id, refreshToken, expiresAt);
        // Retornar datos del usuario sin la contraseña
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                roleId: user.roleId,
                providerId: user.providerId,
                plant: user.plant,
            },
            token: accessToken,
            refreshToken,
        };
    }
    async refresh(refreshToken) {
        // Validar refresh token en BD
        const tokenData = await this.refreshTokenRepository.findByToken(refreshToken);
        if (!tokenData) {
            throw new Error('Refresh token inválido');
        }
        if (tokenData.revokedAt) {
            throw new Error('Refresh token fue revocado');
        }
        if (new Date(tokenData.expiresAt) < new Date()) {
            throw new Error('Refresh token expirado');
        }
        // Obtener usuario y generar nuevo access token
        const user = await this.userRepository.findById(tokenData.userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        const newAccessToken = this.generateAccessToken(user);
        const newRefreshToken = this.generateRefreshToken();
        const newExpiresAt = this.parseExpiration(this.refreshTokenExpiresIn);
        // Revocar token anterior y guardar el nuevo
        await this.refreshTokenRepository.revoke(refreshToken);
        await this.refreshTokenRepository.create(user.id, newRefreshToken, newExpiresAt);
        return {
            token: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }
    async logout(userId) {
        // Revocar todos los refresh tokens del usuario
        await this.refreshTokenRepository.revokeByUserId(userId);
    }
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            return decoded;
        }
        catch (error) {
            throw new Error('Token inválido o expirado');
        }
    }
    async getUserFromToken(token) {
        const decoded = await this.verifyToken(token);
        return this.userRepository.findById(decoded.userId);
    }
    async changePassword(userId, currentPassword, newPassword) {
        if (!newPassword || newPassword.length < constants_1.MIN_PASSWORD_LENGTH) {
            throw new Error(`La nueva contraseña debe tener al menos ${constants_1.MIN_PASSWORD_LENGTH} caracteres`);
        }
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Contraseña actual incorrecta');
        }
        const isSamePassword = await bcryptjs_1.default.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new Error('La nueva contraseña no puede ser igual a la anterior');
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, constants_1.BCRYPT_SALT_ROUNDS);
        await this.userRepository.updatePassword(userId, hashed);
        // Revocar todos los refresh tokens al cambiar contraseña
        await this.refreshTokenRepository.revokeByUserId(userId);
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map