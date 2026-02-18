import { getPool } from '../config/database';

export interface RefreshTokenData {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export class RefreshTokenRepository {
  async create(userId: number, token: string, expiresAtDate: Date): Promise<RefreshTokenData> {
    const pool = await getPool();
    const query = `
      INSERT INTO "RefreshToken" ("userId", token, "expiresAt", "createdAt")
      VALUES ($1, $2, $3, NOW())
      RETURNING id, "userId", token, "expiresAt", "revokedAt", "createdAt"
    `;
    const result = await pool.query(query, [userId, token, expiresAtDate]);
    return result.rows[0];
  }

  async findByToken(token: string): Promise<RefreshTokenData | null> {
    const pool = await getPool();
    const query = `
      SELECT id, "userId", token, "expiresAt", "revokedAt", "createdAt"
      FROM "RefreshToken"
      WHERE token = $1
    `;
    const result = await pool.query(query, [token]);
    return result.rows[0] || null;
  }

  async revoke(token: string): Promise<void> {
    const pool = await getPool();
    const query = `
      UPDATE "RefreshToken"
      SET "revokedAt" = NOW()
      WHERE token = $1
    `;
    await pool.query(query, [token]);
  }

  async revokeByUserId(userId: number): Promise<void> {
    const pool = await getPool();
    const query = `
      UPDATE "RefreshToken"
      SET "revokedAt" = NOW()
      WHERE "userId" = $1 AND "revokedAt" IS NULL
    `;
    await pool.query(query, [userId]);
  }

  async deleteExpired(): Promise<number> {
    const pool = await getPool();
    const query = `
      DELETE FROM "RefreshToken"
      WHERE "expiresAt" < NOW() OR ("revokedAt" IS NOT NULL AND "revokedAt" < NOW() - INTERVAL '7 days')
    `;
    const result = await pool.query(query);
    return result.rowCount || 0;
  }
}
