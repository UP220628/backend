"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const constants_1 = require("../constants");
/** Shared query to fetch user with role and provider details */
const USER_DETAILS_QUERY = (0, database_1.default) `
	SELECT u.id, u.email, u.name, u."roleId", r.name as "roleName", u."providerId", p.name as "providerName", u.plant, u."createdAt", u."updatedAt"
	FROM "User" u
	JOIN "Role" r ON r.id = u."roleId"
	LEFT JOIN "Provider" p ON p.id = u."providerId"
`;
class UserService {
    async createUser(data) {
        const { email, password, name, roleId, providerId, plant } = data;
        if (!email || !password || !name || !roleId) {
            throw new Error('Missing required fields: email, password, name, roleId');
        }
        const finalRoleId = (0, constants_1.mapRoleName)(roleId);
        if (!finalRoleId)
            throw new Error('Invalid roleId');
        // Validación: Si el rol es CARRIER, providerId es requerido
        if (finalRoleId === constants_1.ROLE_IDS.CARRIER && !providerId) {
            throw new Error('CARRIER role requires a providerId');
        }
        // Validación: Si plant está presente, debe ser válido
        if (plant && !constants_1.VALID_PLANTS.includes(plant)) {
            throw new Error(`Plant must be ${constants_1.VALID_PLANTS.join(' or ')}`);
        }
        const hashed = await bcryptjs_1.default.hash(password, constants_1.BCRYPT_SALT_ROUNDS);
        const result = await (0, database_1.default) `
			INSERT INTO "User" (email, password, name, "roleId", "providerId", plant, "createdAt", "updatedAt")
			VALUES (${email}, ${hashed}, ${name}, ${finalRoleId}, ${providerId ?? null}, ${plant ?? null}, NOW() AT TIME ZONE ${constants_1.TIMEZONE}, NOW() AT TIME ZONE ${constants_1.TIMEZONE})
			RETURNING id, email, name, "roleId", "providerId", plant, "createdAt", "updatedAt"
		`;
        return result[0];
    }
    async listUsers() {
        const rows = await (0, database_1.default) `
			${USER_DETAILS_QUERY}
			ORDER BY u."createdAt" DESC
		`;
        return rows;
    }
    async updateUser(id, data) {
        if (!id)
            throw new Error('Missing id');
        const { email, password, name, roleId, providerId, plant } = data;
        const finalRoleId = roleId ? (0, constants_1.mapRoleName)(roleId) : undefined;
        // Validación: Si plant está presente, debe ser válido
        if (plant !== undefined && plant !== null && !constants_1.VALID_PLANTS.includes(plant)) {
            throw new Error(`Plant must be ${constants_1.VALID_PLANTS.join(' or ')}`);
        }
        // Si se incluye password, hashearla
        let hashed = null;
        if (password) {
            hashed = await bcryptjs_1.default.hash(password, constants_1.BCRYPT_SALT_ROUNDS);
        }
        // Build dynamic update — single query instead of 4 branches
        const sets = [];
        const values = [];
        if (email !== undefined) {
            sets.push(`email = $${sets.length + 2}`);
            values.push(email);
        }
        if (name !== undefined) {
            sets.push(`name = $${sets.length + 2}`);
            values.push(name);
        }
        if (finalRoleId !== undefined) {
            sets.push(`"roleId" = $${sets.length + 2}`);
            values.push(finalRoleId);
        }
        if (providerId !== undefined) {
            sets.push(`"providerId" = $${sets.length + 2}`);
            values.push(providerId ?? null);
        }
        if (plant !== undefined) {
            sets.push(`plant = $${sets.length + 2}`);
            values.push(plant ?? null);
        }
        if (hashed) {
            sets.push(`password = $${sets.length + 2}`);
            values.push(hashed);
        }
        if (sets.length > 0) {
            sets.push('"updatedAt" = NOW()');
            await database_1.default.unsafe(`UPDATE "User" SET ${sets.join(', ')} WHERE id = $1`, [id, ...values]);
        }
        const rows = await (0, database_1.default) `
			${USER_DETAILS_QUERY}
			WHERE u.id = ${id}
		`;
        return rows[0];
    }
    async deleteUser(id) {
        if (!id)
            throw new Error('Missing id');
        await (0, database_1.default) `DELETE FROM "User" WHERE id = ${id}`;
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
//# sourceMappingURL=UserService.js.map