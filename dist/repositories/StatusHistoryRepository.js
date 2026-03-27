"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusHistoryRepository = exports.StatusHistoryRepository = void 0;
const database_1 = require("../config/database");
class StatusHistoryRepository {
    async search(filters = {}) {
        const pool = await (0, database_1.getPool)();
        const where = [];
        const params = [];
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
            where.push(`u."providerId" = $${paramIndex}`);
            params.push(filters.providerId);
            paramIndex++;
        }
        if (filters.plant) {
            where.push(`u.plant = $${paramIndex}`);
            params.push(filters.plant);
            paramIndex++;
        }
        // Filtros de fecha para REPORTED events
        let reportedDateFilter = '';
        if (filters.startDate || filters.endDate) {
            const dateConditions = [];
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
        // Query para obtener todos los eventos de unidades que fueron REPORTADAS o SENT (WWS) dentro del rango
        const query = `
      WITH filtered_units AS (
        SELECT DISTINCT u.id as "unitId"
        FROM "UnitEvent" e
        JOIN "Unit" u ON u.id = e."unitId"
        WHERE e."eventType" = 'STATUS_CHANGE'
          AND e."eventData"->>'newStatus' IN ('REPORTED', 'SENT')
          ${reportedDateFilter}
          ${whereSql}
      )
      SELECT
        e.id as "historyId", 
        e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City' as "changedAt",
        u.id as "unitId", u.vin, u.market, u.lane, u."registeredById", u."providerId",
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
exports.StatusHistoryRepository = StatusHistoryRepository;
exports.statusHistoryRepository = new StatusHistoryRepository();
//# sourceMappingURL=StatusHistoryRepository.js.map