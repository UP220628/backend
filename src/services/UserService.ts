import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/UserRepository';
import { User } from '../types';
import sql from '../config/database';

export class UserService {
	private mapRoleId(role: any): number | null {
		if (typeof role === 'number') return role;
		if (typeof role === 'string') {
			const r = role.toUpperCase();
			if (r === 'WWS') return 1;
			if (r === 'SCM') return 2;
			if (r === 'BODY') return 3;
			if (r === 'CARRIER') return 4;
			if (r === 'ADMIN') return 5;
			if (r === 'VQA') return 6;
			const asNum = Number(role);
			if (!isNaN(asNum)) return asNum;
		}
		return null;
	}

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

		const finalRoleId = this.mapRoleId(roleId);
		if (!finalRoleId) throw new Error('Invalid roleId');

		// Validación: Si el rol es CARRIER (4), providerId es requerido
		if (finalRoleId === 4 && !providerId) {
			throw new Error('CARRIER role requires a providerId');
		}

		// Validación: Si plant está presente, debe ser A1 o A2
		if (plant && !['A1', 'A2'].includes(plant)) {
			throw new Error('Plant must be A1 or A2');
		}

		// Encriptar contraseña
		const saltRounds = 10;
		const hashed = await bcrypt.hash(password, saltRounds);

		const result = await sql<[{ id: number; email: string; name: string; 'roleId': number; 'providerId': number | null; plant: string | null; 'createdAt': string; 'updatedAt': string }]>`
			INSERT INTO "User" (email, password, name, "roleId", "providerId", plant, "createdAt", "updatedAt")
			VALUES (${email}, ${hashed}, ${name}, ${finalRoleId}, ${providerId ?? null}, ${plant ?? null}, NOW() AT TIME ZONE 'America/Mexico_City', NOW() AT TIME ZONE 'America/Mexico_City')
			RETURNING id, email, name, "roleId", "providerId", plant, "createdAt", "updatedAt"
		`;

		return result[0];
	}

	async listUsers(): Promise<any[]> {
		const rows = await sql<any[]>`
			SELECT u.id, u.email, u.name, u."roleId", r.name as "roleName", u."providerId", p.name as "providerName", u.plant, u."createdAt", u."updatedAt"
			FROM "User" u
			JOIN "Role" r ON r.id = u."roleId"
			LEFT JOIN "Provider" p ON p.id = u."providerId"
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
		const finalRoleId = roleId ? this.mapRoleId(roleId) : undefined;

		// Validación: Si plant está presente, debe ser A1 o A2
		if (plant !== undefined && plant !== null && !['A1', 'A2'].includes(plant)) {
			throw new Error('Plant must be A1 or A2');
		}

		// Si se incluye password, hashearla
		let hashed: string | null = null;
		if (password) {
			hashed = await bcrypt.hash(password, 10);
		}

		const emailParam = email === undefined ? null : email;
		const nameParam = name === undefined ? null : name;
		const roleParam = finalRoleId === undefined ? null : finalRoleId;

		// Build dynamic update
		if (providerId === undefined && plant === undefined) {
			await sql`
				UPDATE "User" SET
					email = COALESCE(${emailParam}, email),
					name = COALESCE(${nameParam}, name),
					"roleId" = COALESCE(${roleParam}, "roleId"),
					"updatedAt" = NOW()
				WHERE id = ${id}
			`;
		} else if (plant !== undefined && providerId === undefined) {
			await sql`
				UPDATE "User" SET
					email = COALESCE(${emailParam}, email),
					name = COALESCE(${nameParam}, name),
					"roleId" = COALESCE(${roleParam}, "roleId"),
					plant = ${plant ?? null},
					"updatedAt" = NOW()
				WHERE id = ${id}
			`;
		} else if (plant === undefined && providerId !== undefined) {
			// providerId explicitly provided (may be null)
			await sql`
				UPDATE "User" SET
					email = COALESCE(${emailParam}, email),
					name = COALESCE(${nameParam}, name),
					"roleId" = COALESCE(${roleParam}, "roleId"),
					"providerId" = ${providerId ?? null},
					"updatedAt" = NOW()
				WHERE id = ${id}
			`;
		} else {
			// Both plant and providerId provided
			await sql`
				UPDATE "User" SET
					email = COALESCE(${emailParam}, email),
					name = COALESCE(${nameParam}, name),
					"roleId" = COALESCE(${roleParam}, "roleId"),
					"providerId" = ${providerId ?? null},
					plant = ${plant ?? null},
					"updatedAt" = NOW()
				WHERE id = ${id}
			`;
		}

		if (hashed) {
			await sql`
				UPDATE "User" SET password = ${hashed}, "updatedAt" = NOW() WHERE id = ${id}
			`;
		}

		const rows = await sql<any[]>`
			SELECT u.id, u.email, u.name, u."roleId", r.name as "roleName", u."providerId", p.name as "providerName", u.plant, u."createdAt", u."updatedAt"
			FROM "User" u
			JOIN "Role" r ON r.id = u."roleId"
			LEFT JOIN "Provider" p ON p.id = u."providerId"
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
