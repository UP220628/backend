import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { RefreshTokenRepository } from '../repositories/RefreshTokenRepository';
import { User } from '../types';
import { env } from '../config/environment';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    roleId: number;
    providerId?: number;
  };
  token: string;
  refreshToken: string;
}

export interface RefreshResponse {
  token: string;
  refreshToken: string;
}

export class AuthService {
  private userRepository: UserRepository;
  private refreshTokenRepository: RefreshTokenRepository;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor() {
    this.userRepository = new UserRepository();
    this.refreshTokenRepository = new RefreshTokenRepository();
    this.jwtSecret = env.jwtSecret;
    this.jwtExpiresIn = env.jwtExpiresIn;
    this.refreshTokenExpiresIn = env.refreshTokenExpiresIn;
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  // Generar tokens
  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        providerId: user.providerId,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
    );
  }

  private generateRefreshToken(): string {
    return jwt.sign(
      { type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.refreshTokenExpiresIn } as jwt.SignOptions
    );
  }

  private parseExpiration(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid expiration format');
    
    const [, amount, unit] = match;
    const num = parseInt(amount);
    
    switch (unit) {
      case 's': now.setSeconds(now.getSeconds() + num); break;
      case 'm': now.setMinutes(now.getMinutes() + num); break;
      case 'h': now.setHours(now.getHours() + num); break;
      case 'd': now.setDate(now.getDate() + num); break;
    }
    return now;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Buscar usuario por email
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
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
      },
      token: accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
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

  async logout(userId: number): Promise<void> {
    // Revocar todos los refresh tokens del usuario
    await this.refreshTokenRepository.revokeByUserId(userId);
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  async getUserFromToken(token: string): Promise<User | null> {
    const decoded = await this.verifyToken(token);
    return this.userRepository.findById(decoded.userId);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Contraseña actual incorrecta');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new Error('La nueva contraseña no puede ser igual a la anterior');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, hashed);

    // Revocar todos los refresh tokens al cambiar contraseña
    await this.refreshTokenRepository.revokeByUserId(userId);
  }
}
