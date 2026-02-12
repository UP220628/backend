import { getPool } from '../config/database';

export interface StatusHistoryFilters {
  registeredById?: number;
  market?: string;
  vin?: string;
  startDate?: string;
  endDate?: string;
  sort?: 'alpha' | 'date';
  order?: 'asc' | 'desc';
  limit?: number;
  providerId?: number;
}

export class StatusHistoryRepository {
  async search(filters: StatusHistoryFilters = {}) {
    const pool = await getPool();
    
    const where: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.registeredById) {
      where.push(`u."registeredById" = $${paramIndex}`);
      params.push(filters.registeredById);
      paramIndex++;
    }
    if (filters.market) {
      where.push(`u.market = $${paramIndex}`);
      params.push(filters.market);
      paramIndex++;
    }
    if (filters.vin) {
      where.push(`u.vin ILIKE $${paramIndex}`);
      params.push(`%${filters.vin}%`);
      paramIndex++;
    }
    if (filters.providerId) {
      where.push(`registeredBy."providerId" = $${paramIndex}`);
      params.push(filters.providerId);
      paramIndex++;
    }
    // Filtros de fecha para REPORTED events
    let reportedDateFilter = '';
    if (filters.startDate || filters.endDate) {
      const dateConditions: string[] = [];
      if (filters.startDate) {
        dateConditions.push(`e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City' >= $${paramIndex}::timestamp`);
        params.push(filters.startDate + ' 00:00:00');
        paramIndex++;
      }
      if (filters.endDate) {
        dateConditions.push(`e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City' <= $${paramIndex}::timestamp`);
        params.push(filters.endDate + ' 23:59:59');
        paramIndex++;
      }
      reportedDateFilter = `AND ${dateConditions.join(' AND ')}`;
    }

    const sort = filters.sort === 'alpha' ? 'alpha' : 'date';
    const order = (filters.order === 'asc' || filters.order === 'desc') ? filters.order : 'desc';
    const orderBy = sort === 'alpha' ? `u.vin ${order.toUpperCase()}, e."createdAt" DESC` : `e."createdAt" ${order.toUpperCase()}`;
    const limit = filters.limit ?? 200;

    const whereSql = where.length ? `AND ${where.join(' AND ')}` : '';

    // Query para obtener todos los eventos de unidades que fueron REPORTADAS dentro del rango
    const query = `
      WITH filtered_units AS (
        SELECT DISTINCT u.id as "unitId"
        FROM "UnitEvent" e
        JOIN "Unit" u ON u.id = e."unitId"
        JOIN "User" registeredBy ON registeredBy.id = u."registeredById"
        WHERE e."eventType" = 'STATUS_CHANGE'
          AND e."eventData"->>'newStatus' = 'REPORTED'
          ${reportedDateFilter}
          ${whereSql}
      )
      SELECT
        e.id as "historyId", 
        e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City' as "changedAt",
        u.id as "unitId", u.vin, u.market, u.lane, u."registeredById",
        e."eventData"->>'previousStatus' as "previousStatus",
        e."eventData"->>'newStatus' as "newStatus",
        e."eventData"->>'note' as "note",
        cb.name as "changedByName",
        registeredBy.name as "registeredByName"
      FROM "UnitEvent" e
      JOIN "Unit" u ON u.id = e."unitId"
      JOIN "User" cb ON cb.id = e."performedById"
      JOIN "User" registeredBy ON registeredBy.id = u."registeredById"
      WHERE e."eventType" = 'STATUS_CHANGE'
        AND e."unitId" IN (SELECT "unitId" FROM filtered_units)
      ORDER BY ${orderBy.replace('h.', 'e.')}
      LIMIT ${limit}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

export const statusHistoryRepository = new StatusHistoryRepository();