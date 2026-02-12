import sql from '../config/database';

export class ProviderRepository {
	async findAll(): Promise<any[]> {
		const rows = await sql<any[]>`
			SELECT id, name, code, "createdAt", "updatedAt" FROM "Provider" ORDER BY name
		`;
		return rows;
	}

	async create(name: string, code?: string): Promise<any> {
		const result = await sql<[{ id: number; name: string; code: string | null; 'createdAt': string; 'updatedAt': string }]>`
			INSERT INTO "Provider" (name, code, "createdAt", "updatedAt") VALUES (${name}, ${code ?? null}, NOW(), NOW()) RETURNING id, name, code, "createdAt", "updatedAt"
		`;
		return result[0];
	}

	async delete(id: number): Promise<void> {
		await sql`DELETE FROM "Provider" WHERE id = ${id}`;
	}
}

export const providerRepository = new ProviderRepository();
