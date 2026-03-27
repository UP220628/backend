"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const database_1 = require("../config/database");
class UserRepository {
    async findByEmail(email) {
        const pool = await (0, database_1.getPool)();
        const query = `
      SELECT id, email, password, name, "roleId", "providerId", plant,
             "createdAt", "updatedAt"
      FROM "User"
      WHERE email = $1
    `;
        const result = await pool.query(query, [email]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    async findById(id) {
        const pool = await (0, database_1.getPool)();
        const query = `
      SELECT id, email, password, name, "roleId", "providerId", plant,
             "createdAt", "updatedAt"
      FROM "User"
      WHERE id = $1
    `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    async create(user) {
        const pool = await (0, database_1.getPool)();
        const query = `
      INSERT INTO "User" (email, password, name, "roleId", "providerId", plant)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, password, name, "roleId", "providerId", plant,
                "createdAt", "updatedAt"
    `;
        const result = await pool.query(query, [
            user.email,
            user.password,
            user.name,
            user.roleId,
            user.providerId,
            user.plant,
        ]);
        return result.rows[0];
    }
    async updatePassword(userId, hashedPassword) {
        const pool = await (0, database_1.getPool)();
        const query = `
      UPDATE "User"
      SET password = $1, "updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
      WHERE id = $2
    `;
        await pool.query(query, [hashedPassword, userId]);
    }
    async findByRoleIds(roleIds, plant) {
        if (roleIds.length === 0)
            return [];
        const pool = await (0, database_1.getPool)();
        if (plant) {
            const query = `
        SELECT id, email, password, name, "roleId", "providerId", plant,
               "createdAt", "updatedAt"
        FROM "User"
        WHERE "roleId" = ANY($1::int[]) AND (plant = $2 OR plant IS NULL)
      `;
            const result = await pool.query(query, [roleIds, plant]);
            return result.rows;
        }
        const query = `
      SELECT id, email, password, name, "roleId", "providerId", plant,
             "createdAt", "updatedAt"
      FROM "User"
      WHERE "roleId" = ANY($1::int[])
    `;
        const result = await pool.query(query, [roleIds]);
        return result.rows;
    }
}
exports.UserRepository = UserRepository;
exports.userRepository = new UserRepository();
//# sourceMappingURL=UserRepository.js.map