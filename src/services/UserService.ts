import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/UserRepository';
import { User } from '../types';
import sql from '../config/database';
import { ROLE_IDS, BCRYPT_SALT_ROUNDS, VALID_PLANTS, TIMEZONE, mapRoleName } from '../constants';

/** Shared query to fetch user with role and provider details */
const USER_DETAILS_QUERY = sql`
	SELECT u.id, u.email, u.name, u."roleId", r.name as "roleName", u."providerId", p.name as "providerName", u.plant, u."createdAt", u."updatedAt"
	FROM "User" u
	JOIN "Role" r ON r.id = u."roleId"
	LEFT JOIN "Provider" p ON p.id = u."providerId"
`;

export class UserService {
	async createUser(data: {
		email: string;
		password: string;
		name: string;
		roleId: any;
		providerId?: number;
		plant?: string;
	}): Promise<any> {
		const { email, password, name, roleId, providerId, plant } = data;

		if (!email || !password || !name || !roleId) {
			throw new Error('Missing required fields: email, password, name, roleId');
		}

		const finalRoleId = mapRoleName(roleId);
		if (!finalRoleId) throw new Error('Invalid roleId');

		// Validación: Si el rol es CARRIER, providerId es requerido
		if (finalRoleId === ROLE_IDS.CARRIER && !providerId) {
			throw new Error('CARRIER role requires a providerId');
		}

		// Validación: Si plant está presente, debe ser válido
		if (plant && !(VALID_PLANTS as readonly string[]).includes(plant)) {
			throw new Error(`Plant must be ${VALID_PLANTS.join(' or ')}`);
		}

		const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

		const result = await sql<[{ id: number; email: string; name: string; 'roleId': number; 'providerId': number | null; plant: string | null; 'createdAt': string; 'updatedAt': string }]>`
			INSERT INTO "User" (email, password, name, "roleId", "providerId", plant, "createdAt", "updatedAt")
			VALUES (${email}, ${hashed}, ${name}, ${finalRoleId}, ${providerId ?? null}, ${plant ?? null}, NOW() AT TIME ZONE ${TIMEZONE}, NOW() AT TIME ZONE ${TIMEZONE})
			RETURNING id, email, name, "roleId", "providerId", plant, "createdAt", "updatedAt"
		`;

		return result[0];
	}

	async listUsers(): Promise<any[]> {
		const rows = await sql<any[]>`
			${USER_DETAILS_QUERY}
			ORDER BY u."createdAt" DESC
		`;
		return rows;
	}

	async updateUser(id: number, data: {
		email?: string;
		password?: string;
		name?: string;
		roleId?: any;
		providerId?: number;
		plant?: string | null;
	}): Promise<any> {
		if (!id) throw new Error('Missing id');

		const { email, password, name, roleId, providerId, plant } = data;
		const finalRoleId = roleId ? mapRoleName(roleId) : undefined;

		// Validación: Si plant está presente, debe ser válido
		if (plant !== undefined && plant !== null && !(VALID_PLANTS as readonly string[]).includes(plant)) {
			throw new Error(`Plant must be ${VALID_PLANTS.join(' or ')}`);
		}

		// Si se incluye password, hashearla
		let hashed: string | null = null;
		if (password) {
			hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
		}

		// Build dynamic update — single query instead of 4 branches
		const sets: string[] = [];
		const values: any[] = [];

		if (email !== undefined)    { sets.push(`email = $${sets.length + 2}`);         values.push(email); }
		if (name !== undefined)     { sets.push(`name = $${sets.length + 2}`);          values.push(name); }
		if (finalRoleId !== undefined) { sets.push(`"roleId" = $${sets.length + 2}`);   values.push(finalRoleId); }
		if (providerId !== undefined) { sets.push(`"providerId" = $${sets.length + 2}`); values.push(providerId ?? null); }
		if (plant !== undefined)    { sets.push(`plant = $${sets.length + 2}`);         values.push(plant ?? null); }
		if (hashed)                 { sets.push(`password = $${sets.length + 2}`);      values.push(hashed); }

		if (sets.length > 0) {
			sets.push('"updatedAt" = NOW()');
			await sql.unsafe(
				`UPDATE "User" SET ${sets.join(', ')} WHERE id = $1`,
				[id, ...values]
			);
		}

		const rows = await sql<any[]>`
			${USER_DETAILS_QUERY}
			WHERE u.id = ${id}
		`;
		return rows[0];
	}

	async deleteUser(id: number): Promise<void> {
		if (!id) throw new Error('Missing id');
		await sql`DELETE FROM "User" WHERE id = ${id}`;
	}
}

export const userService = new UserService();
