import { getPool } from '../config/database';
import { User } from '../types';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const pool = await getPool();
    const query = `
      SELECT id, email, password, name, "roleId", "providerId", 
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

  async findById(id: number): Promise<User | null> {
    const pool = await getPool();
    const query = `
      SELECT id, email, password, name, "roleId", "providerId",
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

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const pool = await getPool();
    const query = `
      INSERT INTO "User" (email, password, name, "roleId", "providerId")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, password, name, "roleId", "providerId",
                "createdAt", "updatedAt"
    `;
    
    const result = await pool.query(query, [
      user.email,
      user.password,
      user.name,
      user.roleId,
      user.providerId,
    ]);
    
    return result.rows[0];
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    const pool = await getPool();
    const query = `
      UPDATE "User"
      SET password = $1, "updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
      WHERE id = $2
    `;
    await pool.query(query, [hashedPassword, userId]);
  }

  async findByRoleIds(roleIds: number[]): Promise<User[]> {
    if (roleIds.length === 0) return [];

    const pool = await getPool();
    const query = `
      SELECT id, email, password, name, "roleId", "providerId",
             "createdAt", "updatedAt"
      FROM "User"
      WHERE "roleId" = ANY($1::int[])
    `;

    const result = await pool.query(query, [roleIds]);
    return result.rows;
  }
}

export const userRepository = new UserRepository();
