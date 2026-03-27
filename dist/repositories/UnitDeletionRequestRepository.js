"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitDeletionRequestRepository = exports.UnitDeletionRequestRepository = void 0;
const database_1 = __importDefault(require("../config/database"));
class UnitDeletionRequestRepository {
    async findPendingByUnitId(unitId) {
        const result = await (0, database_1.default) `
			SELECT id, "unitId", "requestedById", reason, status, "decisionNote", "decidedById", "requestedAt", "decidedAt", "createdAt", "updatedAt"
			FROM "UnitDeletionRequest"
			WHERE "unitId" = ${unitId} AND status = 'PENDING'
			LIMIT 1
		`;
        return result[0] || null;
    }
    async create(unitId, requestedById, reason) {
        const result = await (0, database_1.default) `
			INSERT INTO "UnitDeletionRequest" ("unitId", "requestedById", reason, status, "requestedAt", "createdAt", "updatedAt")
			VALUES (${unitId}, ${requestedById}, ${reason}, 'PENDING', NOW() AT TIME ZONE 'America/Mexico_City', NOW() AT TIME ZONE 'America/Mexico_City', NOW() AT TIME ZONE 'America/Mexico_City')
			RETURNING id, "unitId", "requestedById", reason, status, "decisionNote", "decidedById", "requestedAt", "decidedAt", "createdAt", "updatedAt"
		`;
        return result[0];
    }
    async listByStatus(status, plant) {
        return (0, database_1.default) `
			SELECT
				r.id,
				r."unitId",
				r."requestedById",
				r.reason,
				r.status,
				r."decisionNote",
				r."decidedById",
				r."requestedAt",
				r."decidedAt",
				u.vin,
				u.market,
				u.lane,
				u.plant,
				req.name as "requestedByName",
				dec.name as "decidedByName"
			FROM "UnitDeletionRequest" r
			JOIN "Unit" u ON u.id = r."unitId"
			LEFT JOIN "User" req ON req.id = r."requestedById"
			LEFT JOIN "User" dec ON dec.id = r."decidedById"
			WHERE r.status = ${status}
			${plant ? (0, database_1.default) `AND u.plant = ${plant}` : (0, database_1.default) ``}
			ORDER BY r."requestedAt" ASC
		`;
    }
    async findById(requestId) {
        const result = await (0, database_1.default) `
			SELECT
				r.id,
				r."unitId",
				r."requestedById",
				r.reason,
				r.status,
				r."decisionNote",
				r."decidedById",
				r."requestedAt",
				r."decidedAt",
				u.vin,
				u.market,
				u.lane,
				u."providerId",
				u.plant
			FROM "UnitDeletionRequest" r
			JOIN "Unit" u ON u.id = r."unitId"
			WHERE r.id = ${requestId}
			LIMIT 1
		`;
        return result[0] || null;
    }
    async reject(requestId, decisionNote, decidedById) {
        const result = await (0, database_1.default) `
			UPDATE "UnitDeletionRequest"
			SET
				status = 'REJECTED',
				"decisionNote" = ${decisionNote},
				"decidedById" = ${decidedById},
				"decidedAt" = NOW() AT TIME ZONE 'America/Mexico_City',
				"updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
			WHERE id = ${requestId} AND status = 'PENDING'
			RETURNING id, "unitId", "requestedById", reason, status, "decisionNote", "decidedById", "requestedAt", "decidedAt", "createdAt", "updatedAt"
		`;
        if (!result[0]) {
            throw new Error('Request is not pending or does not exist');
        }
        return result[0];
    }
    async approveAndDeleteUnit(requestId, decidedById) {
        return database_1.default.begin(async (trx) => {
            const requestRows = await trx `
				SELECT r.id, r."unitId", r."requestedById", r.reason, r.status, u.vin, u.market, u.lane, u."providerId", u.plant
				FROM "UnitDeletionRequest" r
				JOIN "Unit" u ON u.id = r."unitId"
				WHERE r.id = ${requestId}
				LIMIT 1
			`;
            const request = requestRows[0];
            if (!request) {
                throw new Error('Deletion request not found');
            }
            if (request.status !== 'PENDING') {
                throw new Error('Request is not pending');
            }
            await trx `
				UPDATE "UnitDeletionRequest"
				SET
					status = 'APPROVED',
					"decidedById" = ${decidedById},
					"decidedAt" = NOW() AT TIME ZONE 'America/Mexico_City',
					"updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
				WHERE id = ${requestId}
			`;
            await trx `
				DELETE FROM "Unit"
				WHERE id = ${request.unitId}
			`;
            return request;
        });
    }
}
exports.UnitDeletionRequestRepository = UnitDeletionRequestRepository;
exports.unitDeletionRequestRepository = new UnitDeletionRequestRepository();
//# sourceMappingURL=UnitDeletionRequestRepository.js.map