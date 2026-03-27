import sql from '../config/database';

export type UnitDeletionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type UnitDeletionRequestRecord = {
	id: number;
	unitId: number;
	requestedById: number;
	reason: string;
	status: UnitDeletionRequestStatus;
	decisionNote: string | null;
	decidedById: number | null;
	requestedAt: Date;
	decidedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export class UnitDeletionRequestRepository {
	async findPendingByUnitId(unitId: number): Promise<UnitDeletionRequestRecord | null> {
		const result = await sql<UnitDeletionRequestRecord[]>`
			SELECT id, "unitId", "requestedById", reason, status, "decisionNote", "decidedById", "requestedAt", "decidedAt", "createdAt", "updatedAt"
			FROM "UnitDeletionRequest"
			WHERE "unitId" = ${unitId} AND status = 'PENDING'
			LIMIT 1
		`;
		return result[0] || null;
	}

	async create(unitId: number, requestedById: number, reason: string): Promise<UnitDeletionRequestRecord> {
		const result = await sql<UnitDeletionRequestRecord[]>`
			INSERT INTO "UnitDeletionRequest" ("unitId", "requestedById", reason, status, "requestedAt", "createdAt", "updatedAt")
			VALUES (${unitId}, ${requestedById}, ${reason}, 'PENDING', NOW() AT TIME ZONE 'America/Mexico_City', NOW() AT TIME ZONE 'America/Mexico_City', NOW() AT TIME ZONE 'America/Mexico_City')
			RETURNING id, "unitId", "requestedById", reason, status, "decisionNote", "decidedById", "requestedAt", "decidedAt", "createdAt", "updatedAt"
		`;
		return result[0];
	}

	async listByStatus(status: UnitDeletionRequestStatus, plant?: string) {
		return sql<any[]>`
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
			${plant ? sql`AND u.plant = ${plant}` : sql``}
			ORDER BY r."requestedAt" ASC
		`;
	}

	async findById(requestId: number) {
		const result = await sql<any[]>`
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

	async reject(requestId: number, decisionNote: string | null, decidedById: number) {
		const result = await sql<any[]>`
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

	async approveAndDeleteUnit(requestId: number, decidedById: number) {
		return sql.begin(async (trx: any) => {
			const requestRows = await trx<any[]>`
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

			await trx`
				UPDATE "UnitDeletionRequest"
				SET
					status = 'APPROVED',
					"decidedById" = ${decidedById},
					"decidedAt" = NOW() AT TIME ZONE 'America/Mexico_City',
					"updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
				WHERE id = ${requestId}
			`;

			await trx`
				DELETE FROM "Unit"
				WHERE id = ${request.unitId}
			`;

			return request;
		});
	}
}

export const unitDeletionRequestRepository = new UnitDeletionRequestRepository();
