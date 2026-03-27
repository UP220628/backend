"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenRepository = void 0;
const database_1 = require("../config/database");
class RefreshTokenRepository {
    async create(userId, token, expiresAtDate) {
        const pool = await (0, database_1.getPool)();
        const query = `
      INSERT INTO "RefreshToken" ("userId", token, "expiresAt", "createdAt")
      VALUES ($1, $2, $3, NOW())
      RETURNING id, "userId", token, "expiresAt", "revokedAt", "createdAt"
    `;
        const result = await pool.query(query, [userId, token, expiresAtDate]);
        return result.rows[0];
    }
    async findByToken(token) {
        const pool = await (0, database_1.getPool)();
        const query = `
      SELECT id, "userId", token, "expiresAt", "revokedAt", "createdAt"
      FROM "RefreshToken"
      WHERE token = $1
    `;
        const result = await pool.query(query, [token]);
        return result.rows[0] || null;
    }
    async revoke(token) {
        const pool = await (0, database_1.getPool)();
        const query = `
      UPDATE "RefreshToken"
      SET "revokedAt" = NOW()
      WHERE token = $1
    `;
        await pool.query(query, [token]);
    }
    async revokeByUserId(userId) {
        const pool = await (0, database_1.getPool)();
        const query = `
      UPDATE "RefreshToken"
      SET "revokedAt" = NOW()
      WHERE "userId" = $1 AND "revokedAt" IS NULL
    `;
        await pool.query(query, [userId]);
    }
    async deleteExpired() {
        const pool = await (0, database_1.getPool)();
        const query = `
      DELETE FROM "RefreshToken"
      WHERE "expiresAt" < NOW() OR ("revokedAt" IS NOT NULL AND "revokedAt" < NOW() - INTERVAL '7 days')
    `;
        const result = await pool.query(query);
        return result.rowCount || 0;
    }
}
exports.RefreshTokenRepository = RefreshTokenRepository;
//# sourceMappingURL=RefreshTokenRepository.js.map