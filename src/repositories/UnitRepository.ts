import sql from '../config/database';
import type { Unit } from '../types';

export class UnitRepository {
	async findAll(limit = 50, providerId?: number, plant?: string): Promise<Array<Unit & { statusName: string }>> {
		// Build WHERE conditions dynamically
		const hasProvider = providerId !== undefined && providerId !== null;
		const hasPlant = plant !== undefined && plant !== null;
		
		const result = await sql<Array<Unit & { statusName: string }>>`
			SELECT
				u.id, u.vin, u.market, u.lane, u."statusId", u."providerId", u.plant,
				u."isAvailableToday", u."registeredById", u."estimatedRepairHours",
				u."estimatedCompletionDate",
				u."priorityNote", u."priorityRank", u."priorityAssignedById", u."priorityAssignedAt",
				u."createdAt", u."updatedAt", u."vqaComment",
				s.name as "statusName"
			FROM "Unit" u
			JOIN "UnitStatus" s ON s.id = u."statusId"
			WHERE 1=1
			${hasProvider ? sql`AND u."providerId" = ${providerId}` : sql``}
			${hasPlant ? sql`AND u.plant = ${plant}` : sql``}
			ORDER BY u."createdAt" DESC
			LIMIT ${limit}
		`;
		return result as any;
	}

	async findById(id: number): Promise<(Unit & { statusName: string }) | null> {
		const result = await sql<Array<Unit & { statusName: string }>>`
			SELECT
				u.id, u.vin, u.market, u.lane, u."statusId", u."providerId", u.plant,
				u."isAvailableToday", u."registeredById", u."estimatedRepairHours",
				u."estimatedCompletionDate",
				u."priorityNote", u."priorityRank", u."priorityAssignedById", u."priorityAssignedAt",
				u."createdAt", u."updatedAt", u."vqaComment",
				s.name as "statusName"
			FROM "Unit" u
			JOIN "UnitStatus" s ON s.id = u."statusId"
			WHERE u.id = ${id}
		`;
		return result[0] || null;
	}

	async getRegisteredByProviderId(unitId: number): Promise<number | null> {
		const result = await sql<Array<{ providerId: number | null }>>`
			SELECT u."providerId" as "providerId"
			FROM "Unit" u
			WHERE u.id = ${unitId}
			LIMIT 1
		`;
		return result[0]?.providerId ?? null;
	}

	async findByVin(vin: string, plant?: string): Promise<(Unit & { statusName: string }) | null> {
		const result = await sql<Array<Unit & { statusName: string }>>`
			SELECT
				u.id, u.vin, u.market, u.lane, u."statusId", u."providerId", u.plant,
				u."isAvailableToday", u."registeredById", u."estimatedRepairHours",
				u."estimatedCompletionDate",
				u."priorityNote", u."priorityRank", u."priorityAssignedById", u."priorityAssignedAt",
				u."createdAt", u."updatedAt", u."vqaComment",
				s.name as "statusName"
			FROM "Unit" u
			JOIN "UnitStatus" s ON s.id = u."statusId"
			WHERE u.vin = ${vin}
			${plant ? sql`AND u.plant = ${plant}` : sql``}
		`;
		return result[0] || null;
	}

	async findByStatusName(name: string, limit = 50, providerId?: number, plant?: string): Promise<Array<Unit & { statusName: string; defects?: any[] }>> {
		const hasProvider = providerId !== undefined && providerId !== null;
		const hasPlant = plant !== undefined && plant !== null;
		
		const result = await sql<any[]>`
			SELECT
				u.id, u.vin, u.market, u.lane, u."statusId", u."providerId", u.plant,
				u."isAvailableToday", u."registeredById", u."estimatedRepairHours",
				u."estimatedCompletionDate",
				u."priorityNote", u."priorityRank", u."priorityAssignedById", u."priorityAssignedAt",
				u."createdAt", u."updatedAt", u."vqaComment",
				s.name as "statusName",
				d.id as "defectId", d."defectType", d.zone, d."gradeId", dg.code as grade, d.description, d."isResolved"
			FROM "Unit" u
			JOIN "UnitStatus" s ON s.id = u."statusId"
			LEFT JOIN "UnitDefect" d ON d."unitId" = u.id AND d."isActive" = TRUE
			LEFT JOIN "DefectGrade" dg ON dg.id = d."gradeId"
			WHERE s.name = ${name}
			${hasProvider ? sql`AND u."providerId" = ${providerId}` : sql``}
			${hasPlant ? sql`AND u.plant = ${plant}` : sql``}
			ORDER BY u."createdAt" DESC
			LIMIT ${limit}
		`;

		// Group defects by unit
		const unitsMap = new Map<number, any>();
		for (const row of result) {
			if (!unitsMap.has(row.id)) {
				unitsMap.set(row.id, {
					id: row.id,
					vin: row.vin,
					market: row.market,
					lane: row.lane,
					statusId: row.statusId,
					providerId: row.providerId,
					plant: row.plant,
					statusName: row.statusName,
					isAvailableToday: row.isAvailableToday,
					registeredById: row.registeredById,
					estimatedRepairHours: row.estimatedRepairHours,
					estimatedCompletionDate: row.estimatedCompletionDate,
					priority: row.priority,
					priorityNote: row.priorityNote,
					priorityRank: row.priorityRank,
					priorityAssignedById: row.priorityAssignedById,
					priorityAssignedAt: row.priorityAssignedAt,
					createdAt: row.createdAt,
					updatedAt: row.updatedAt,
					defects: [],
				});
			}
			
			if (row.defectId) {
				unitsMap.get(row.id)!.defects.push({
					id: row.defectId,
					type: row.defectType,
					zone: row.zone,
					grade: row.grade,
					description: row.description,
					isResolved: row.isResolved,
				});
			}
		}

		return Array.from(unitsMap.values());
	}

	async updatePriority(unitId: number, note: string | null, rank: number | null, assignedById: number): Promise<void> {
		// If rank is not provided, auto-assign the next available rank
		let finalRank = rank;
		if (!rank) {
			const maxRankResult = await sql<[{ max_rank: number }]>`
				SELECT COALESCE(MAX("priorityRank"), 0) as max_rank FROM "Unit" WHERE "priorityRank" IS NOT NULL
			`;
			finalRank = (maxRankResult[0]?.max_rank || 0) + 1;
		}

		await sql`
			UPDATE "Unit" SET
				"priorityNote" = ${note},
				"priorityRank" = ${finalRank},
				"priorityAssignedById" = ${assignedById},
				"priorityAssignedAt" = NOW() AT TIME ZONE 'America/Mexico_City',
				"updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
			WHERE id = ${unitId}
		`;
	}

	async reorderPriority(unitIds: number[], assignedById: number): Promise<void> {
		await sql.begin(async (trx: any) => {
			for (let i = 0; i < unitIds.length; i++) {
				await trx`
					UPDATE "Unit" SET
						"priorityRank" = ${i + 1},
						"priorityAssignedById" = ${assignedById},
						"priorityAssignedAt" = NOW() AT TIME ZONE 'America/Mexico_City',
						"updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
					WHERE id = ${unitIds[i]}
				`;
			}
		});
	}

	async updateStatus(unitId: number, newStatusName: string, changedById: number, estimatedRepairHours?: number, isAvailableToday?: boolean, note?: string, vqaComment?: string): Promise<void> {
		await sql.begin(async (trx: any) => {
			const statusResult = await trx`
				SELECT id FROM "UnitStatus" WHERE name = ${newStatusName}
			`;
			const newStatusId = (statusResult as Array<{ id: number }>)[0]?.id;
			if (!newStatusId) throw new Error('Invalid status');

			const unitResult = await trx`
				SELECT "statusId" FROM "Unit" WHERE id = ${unitId}
			`;
			const previousStatusId = (unitResult as Array<{ statusId: number }>)[0]?.statusId;

			// Actualizar status y opcionalmente las horas estimadas e isAvailableToday
			const updates: any = {
				statusId: newStatusId,
				updatedAt: sql`NOW() AT TIME ZONE 'America/Mexico_City'`
			};
			
			if (estimatedRepairHours !== undefined) {
				updates.estimatedRepairHours = estimatedRepairHours;
		}
		
		// Si se está iniciando reparación, calcular fecha estimada de finalización
		if (newStatusName === 'IN_REPAIR' && estimatedRepairHours !== undefined) {
			// Obtener unidades en reparación para calcular la cola
			const unitsInRepair = await trx<any[]>`
				SELECT 
					u."estimatedCompletionDate"
				FROM "Unit" u
				JOIN "UnitStatus" s ON s.id = u."statusId"
				WHERE s.name = 'IN_REPAIR' 
				AND u."estimatedRepairHours" IS NOT NULL
				AND u.id != ${unitId}
				ORDER BY u."estimatedCompletionDate" DESC NULLS LAST
				LIMIT 1
			`;

			let startDate = new Date();
			if (unitsInRepair.length > 0 && unitsInRepair[0].estimatedCompletionDate) {
				startDate = new Date(unitsInRepair[0].estimatedCompletionDate);
			}

			const completionDate = new Date(startDate.getTime() + estimatedRepairHours * 60 * 60 * 1000);
			updates.estimatedCompletionDate = completionDate;
		}

		// Si cambia a IN_REPAIR o RELEASED, limpiar priorityRank ya que sale de la cola RECEIVED
		if (newStatusName === 'IN_REPAIR' || newStatusName === 'RELEASED' || newStatusName === 'WWS_RELEASED' || newStatusName === 'ACCEPTED') {
			updates.priorityRank = null;
		}

		// Marcar todos los defectos activos como resueltos cuando BODY libera la unidad
		if (newStatusName === 'RELEASED') {
			await trx`
				UPDATE "UnitDefect" SET "isResolved" = TRUE, "updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
				WHERE "unitId" = ${unitId} AND "isActive" = TRUE AND "isResolved" = FALSE
			`;
		}

		if (isAvailableToday !== undefined) {
			updates.isAvailableToday = isAvailableToday;
		}

		if (vqaComment !== undefined) {
			updates.vqaComment = vqaComment;
		}

		await trx`
			UPDATE "Unit" 
			SET ${sql(updates)}
			WHERE id = ${unitId}
		`;

		// Obtener nombres de estados para el evento
		const prevStatus = previousStatusId ? await trx`SELECT name FROM "UnitStatus" WHERE id = ${previousStatusId}` : null;
		const newStatus = await trx`SELECT name FROM "UnitStatus" WHERE id = ${newStatusId}`;

		// Crear evento con toda la información del cambio
		const eventData: any = {
			previousStatus: prevStatus?.[0]?.name || null,
			newStatus: newStatus[0]?.name,
			previousStatusId: previousStatusId,
			newStatusId: newStatusId
		};

		// Agregar datos adicionales si existen
		if (updates.estimatedRepairHours) eventData.estimatedRepairHours = updates.estimatedRepairHours;
		if (updates.isAvailableToday !== undefined) eventData.isAvailableToday = updates.isAvailableToday;
		if (note) eventData.note = note;

		await trx`
			INSERT INTO "UnitEvent" ("unitId", "eventType", "eventData", "performedById", "createdAt")
			VALUES (${unitId}, 'STATUS_CHANGE', ${sql.json(eventData)}, ${changedById}, NOW() AT TIME ZONE 'America/Mexico_City')
		`;
	});
}

	async create(unit: Pick<Unit, 'vin'|'market'|'lane'|'registeredById'|'providerId'|'plant'>, initialStatus: string = 'REPORTED'): Promise<number> {
		return await sql.begin(async (trx: any) => {
			// Obtener el statusId del estado inicial especificado
			const statusResult = await trx`
				SELECT id FROM "UnitStatus" WHERE name = ${initialStatus}
			`;
			const statusId = (statusResult as Array<{ id: number }>)[0]?.id;
			
			if (!statusId) {
				throw new Error(`Status ${initialStatus} no encontrado en la base de datos`);
			}
			
			// Insertar la unidad
			const result = await trx`
				INSERT INTO "Unit" (vin, market, lane, "registeredById", "providerId", plant, "statusId", "createdAt", "updatedAt")
				VALUES (${unit.vin}, ${unit.market}, ${unit.lane}, ${unit.registeredById}, ${unit.providerId || null}, ${unit.plant || null}, ${statusId}, NOW() AT TIME ZONE 'America/Mexico_City', NOW() AT TIME ZONE 'America/Mexico_City')
				RETURNING id
			`;
			
			const unitId = (result as Array<{ id: number }>)[0].id;
			
			// Obtener nombre del status inicial
			const statusName = await trx`SELECT name FROM "UnitStatus" WHERE id = ${statusId}`;
			
			// Crear evento inicial
			const eventData = {
				previousStatus: null,
				newStatus: statusName[0]?.name || initialStatus,
				previousStatusId: null,
				newStatusId: statusId,
				initialRegistration: true
			};
			
			await trx`
				INSERT INTO "UnitEvent" ("unitId", "eventType", "eventData", "performedById", "createdAt")
				VALUES (${unitId}, 'STATUS_CHANGE', ${sql.json(eventData)}, ${unit.registeredById}, NOW() AT TIME ZONE 'America/Mexico_City')
			`;
			
			return unitId;
		});
	}

	async findByIdWithDefects(id: number): Promise<any | null> {
		const result = await sql<any[]>`
			SELECT
				u.id, u.vin, u.market, u.lane, u."statusId", u."providerId",
				u."isAvailableToday", u."registeredById", u."estimatedRepairHours",
				u."estimatedCompletionDate",
				u."priorityNote", u."priorityRank", u."priorityAssignedById", u."priorityAssignedAt",
				u."createdAt", u."updatedAt", u."vqaComment",
				s.name as "statusName",
				d.id as "defectId", d."defectType", d.zone, d."gradeId", dg.code as grade, d.description, d."isResolved"
			FROM "Unit" u
			JOIN "UnitStatus" s ON s.id = u."statusId"
			LEFT JOIN "UnitDefect" d ON d."unitId" = u.id AND d."isActive" = TRUE
			LEFT JOIN "DefectGrade" dg ON dg.id = d."gradeId"
			WHERE u.id = ${id}
		`;

		if (result.length === 0) return null;

		const unitData = result[0];
		const defects = result
			.filter((row: any) => row.defectId)
			.map((row: any) => ({
				id: row.defectId,
				type: row.defectType,
				zone: row.zone,
				grade: row.grade,
				isResolved: row.isResolved,
			}));

		return {
			id: unitData.id,
			vin: unitData.vin,
			market: unitData.market,
			lane: unitData.lane,
			statusId: unitData.statusId,
			providerId: unitData.providerId,
			statusName: unitData.statusName,
			isAvailableToday: unitData.isAvailableToday,
			registeredById: unitData.registeredById,
			estimatedRepairHours: unitData.estimatedRepairHours,
			estimatedCompletionDate: unitData.estimatedCompletionDate,

			priorityNote: unitData.priorityNote,
			priorityRank: unitData.priorityRank,
			priorityAssignedById: unitData.priorityAssignedById,
			priorityAssignedAt: unitData.priorityAssignedAt,
			createdAt: unitData.createdAt,
			updatedAt: unitData.updatedAt,
			defects,
		};
	}

	async createDefect(
		unitId: number,
		defectType: string,
		zone: string,
		gradeCode: string,
		description: string | null,
		registeredById: number,
		options?: { isFromWws?: boolean; overrideExisting?: boolean; wwsVersion?: string }
	): Promise<number> {
		const gradeRes = await sql<[{ id: number }]>`
			SELECT id FROM "DefectGrade" WHERE code = ${gradeCode}
		`;
		const gradeId = gradeRes[0]?.id;
		if (!gradeId) throw new Error('Invalid grade code');

		const isFromWws = options?.isFromWws === true;
		const overrideExisting = options?.overrideExisting === true;
		const wwsVersion = options?.wwsVersion ?? null;

		// Buscar defectos activos existentes con la misma combinación
		const existing = await sql<any[]>`
			SELECT id, "gradeId" FROM "UnitDefect" WHERE "unitId" = ${unitId} AND "defectType" = ${defectType} AND zone = ${zone} AND "isActive" = TRUE
		`;

		if (existing.length > 0) {
			const existingRow = existing[0];
			if (existingRow.gradeId === gradeId) {
				// Mismo grado: evitar duplicado y devolver existente
				return existingRow.id;
			}
			// Diferente grado
			if (isFromWws && overrideExisting) {
				// Marcar existente como inactivo y registrar override
				await sql`
					UPDATE "UnitDefect" SET "isActive" = FALSE, "overriddenByWws" = TRUE, "wwsVersion" = ${wwsVersion}, "updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City' WHERE id = ${existingRow.id}
				`;
				// Luego insertamos el nuevo
			} else {
				// Si no se permite override, insertamos un nuevo registro (posible duplicado)
			}
		}

		const result = await sql<[{ id: number }]>`
			INSERT INTO "UnitDefect" ("unitId", "defectType", zone, "gradeId", description, "registeredById", "isActive", "wwsVersion", "createdAt", "updatedAt")
			VALUES (${unitId}, ${defectType}, ${zone}, ${gradeId}, ${description}, ${registeredById}, TRUE, ${wwsVersion}, NOW() AT TIME ZONE 'America/Mexico_City', NOW() AT TIME ZONE 'America/Mexico_City')
			RETURNING id
		`;
		return result[0].id;
	}

	async updateDefectGrade(defectId: number, newGrade: string, updatedById: number): Promise<void> {
		const gradeRes = await sql<Array<{ id: number }>>`
			SELECT id FROM "DefectGrade" WHERE code = ${newGrade}
		`;
		const gradeId = gradeRes[0]?.id;
		if (!gradeId) throw new Error('Invalid grade code');

		await sql`
			UPDATE "UnitDefect" 
			SET "gradeId" = ${gradeId}, "updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
			WHERE id = ${defectId}
		`;
	}

	async getDefectStats(todayOnly: boolean = false): Promise<{ v1: number; v2: number; v3: number }> {
		const result = await sql<Array<{ code: string; count: number }>>`
			SELECT dg.code, COUNT(ud.id)::int as count
			FROM "UnitDefect" ud
			JOIN "DefectGrade" dg ON dg.id = ud."gradeId"
			${todayOnly ? sql`JOIN "Unit" u ON u.id = ud."unitId" WHERE ud."isActive" = TRUE AND (u."createdAt" AT TIME ZONE 'America/Mexico_City')::date = (NOW() AT TIME ZONE 'America/Mexico_City')::date` : sql`WHERE ud."isActive" = TRUE`}
			GROUP BY dg.code
		`;

		const stats = { v1: 0, v2: 0, v3: 0 };
		result.forEach((row: any) => {
			if (row.code === 'V1') stats.v1 = row.count;
			else if (row.code === 'V2') stats.v2 = row.count;
			else if (row.code === 'V3') stats.v3 = row.count;
		});
		return stats;
	}

	async getTodayUnits(providerId?: number): Promise<any[]> {
		const result = await sql<any[]>`
			SELECT
				u.id, u.vin, u.market, u.lane, u."statusId", u."providerId",
				u."isAvailableToday", u."registeredById", u."estimatedRepairHours",
				u."estimatedCompletionDate",
				u."priorityNote", u."priorityRank",
				u."scmDecision", u."scmDecisionNote", 
				'' || TO_CHAR(u."scmDecisionAt", 'YYYY-MM-DD"T"HH24:MI:SS') || '-06:00' as "scmDecisionAt", 
				u."scmDecisionById",
				'' || TO_CHAR(u."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS') || '-06:00' as "createdAt", 
				'' || TO_CHAR(u."updatedAt", 'YYYY-MM-DD"T"HH24:MI:SS') || '-06:00' as "updatedAt",
				'' || TO_CHAR(last_status."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS') || '-06:00' as "statusUpdatedAt",
				s.name as "statusName",
				usr.name as "registeredBy",
				usr."providerId" as "registeredByProviderId",
				scm.name as "scmDecidedBy"
			FROM "Unit" u
			JOIN "UnitStatus" s ON s.id = u."statusId"
			LEFT JOIN "User" usr ON usr.id = u."registeredById"
			LEFT JOIN "User" scm ON scm.id = u."scmDecisionById"
			LEFT JOIN LATERAL (
				SELECT "createdAt"
				FROM "UnitEvent"
				WHERE "unitId" = u.id AND "eventType" = 'STATUS_CHANGE'
				ORDER BY "createdAt" DESC
				LIMIT 1
			) last_status ON TRUE
			WHERE (u."createdAt" AT TIME ZONE 'America/Mexico_City')::date = (NOW() AT TIME ZONE 'America/Mexico_City')::date
			${providerId ? sql`AND u."providerId" = ${providerId}` : sql``}
			ORDER BY u."createdAt" DESC
		`;
		
		return result;
	}

	async setScmDecision(unitId: number, decision: string, note: string | null, decidedById: number): Promise<void> {
		await sql`
			UPDATE "Unit"
			SET 
				"scmDecision" = ${decision},
				"scmDecisionNote" = ${note},
				"scmDecisionAt" = NOW() AT TIME ZONE 'America/Mexico_City',
				"scmDecisionById" = ${decidedById},
				"updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
			WHERE id = ${unitId}
		`;
	}

	async createNoteEvent(unitId: number, eventType: string, note: string, performedById: number): Promise<void> {
		const eventData = {
			note: note,
			timestamp: new Date().toISOString()
		};

		await sql`
			INSERT INTO "UnitEvent" ("unitId", "eventType", "eventData", "performedById", "createdAt")
			VALUES (${unitId}, ${eventType}, ${sql.json(eventData)}, ${performedById}, NOW() AT TIME ZONE 'America/Mexico_City')
		`;
	}

async getStatusStats(): Promise<Record<string, number>> {
	const result = await sql<Array<{ statusName: string; count: number }>>`
		SELECT 
			s.name as "statusName",
			COUNT(u.id)::int as count
		FROM "UnitStatus" s
		LEFT JOIN "Unit" u ON u."statusId" = s.id
		GROUP BY s.name
		HAVING COUNT(u.id) > 0
		ORDER BY s.name
	`;
	
	const stats: Record<string, number> = {};
	for (const row of result) {
		stats[row.statusName] = row.count;
	}
	return stats;
	}

	// Obtener unidades actualmente en reparación con tiempos estimados
	async getUnitsInRepair(providerId?: number): Promise<Array<{ id: number; vin: string; estimatedRepairHours: number; estimatedCompletionDate: Date | null; updatedAt: Date; providerId: number | null; providerName: string | null }>> {
		const result = await sql<any[]>`
			SELECT 
				u.id, 
				u.vin, 
				u."estimatedRepairHours", 
				u."estimatedCompletionDate",
				u."updatedAt",
				u."providerId",
				p.name as "providerName"
			FROM "Unit" u
			JOIN "UnitStatus" s ON s.id = u."statusId"
			LEFT JOIN "Provider" p ON p.id = u."providerId"
			WHERE s.name = 'IN_REPAIR' 
			AND u."estimatedRepairHours" IS NOT NULL
			${providerId ? sql`AND u."providerId" = ${providerId}` : sql``}
			ORDER BY p.name ASC NULLS LAST, u."updatedAt" ASC
		`;
		return result;
	}

	// Calcular fecha estimada de finalización basándose en unidades en reparación
	async calculateEstimatedCompletionDate(newEstimatedHours: number): Promise<Date> {
		const unitsInRepair = await this.getUnitsInRepair();
		
		let latestCompletionTime: Date | null = null;

		// Encontrar la última hora de finalización estimada de las unidades actuales
		for (const unit of unitsInRepair) {
			if (unit.estimatedCompletionDate) {
				if (!latestCompletionTime || new Date(unit.estimatedCompletionDate) > latestCompletionTime) {
					latestCompletionTime = new Date(unit.estimatedCompletionDate);
				}
			}
		}

		// Si no hay unidades en reparación o ninguna tiene fecha estimada, empezar desde ahora
		const startDate = latestCompletionTime || new Date();
		
		// Agregar las horas estimadas para la nueva unidad
		const completionDate = new Date(startDate.getTime() + newEstimatedHours * 60 * 60 * 1000);
		
		return completionDate;
	}

	// Actualizar tiempo estimado de una unidad (puede estar en reparación o no)
	async updateEstimatedRepairTime(unitId: number, estimatedRepairHours: number, updatedById: number): Promise<void> {
		// Calcular nueva fecha de finalización
		const unit = await this.findById(unitId);
		if (!unit) throw new Error('Unit not found');

		let estimatedCompletionDate: Date;

		if (unit.statusName === 'IN_REPAIR') {
			// Si ya está en reparación, calcular considerando las otras unidades
			// pero excluyendo esta unidad del cálculo
			const unitsInRepair = await sql<any[]>`
				SELECT 
					u.id, 
					u."estimatedCompletionDate"
				FROM "Unit" u
				JOIN "UnitStatus" s ON s.id = u."statusId"
				WHERE s.name = 'IN_REPAIR' 
				AND u."estimatedRepairHours" IS NOT NULL
				AND u.id != ${unitId}
				ORDER BY u."estimatedCompletionDate" ASC NULLS LAST
			`;

			let latestCompletionTime: Date | null = null;
			for (const u of unitsInRepair) {
				if (u.estimatedCompletionDate) {
					const date = new Date(u.estimatedCompletionDate);
					if (!latestCompletionTime || date > latestCompletionTime) {
						latestCompletionTime = date;
					}
				}
			}

			// Si esta unidad ya tiene una fecha de inicio implícita (su updatedAt cuando entró a IN_REPAIR),
			// mantener ese punto de inicio o usar ahora si no hay otras unidades
			const startDate = latestCompletionTime || unit.updatedAt || new Date();
			estimatedCompletionDate = new Date(startDate.getTime() + estimatedRepairHours * 60 * 60 * 1000);
		} else {
			// Si no está en reparación aún, calcular basándose en todas las unidades actuales
			estimatedCompletionDate = await this.calculateEstimatedCompletionDate(estimatedRepairHours);
		}

		await sql`
			UPDATE "Unit"
			SET 
				"estimatedRepairHours" = ${estimatedRepairHours},
				"estimatedCompletionDate" = ${estimatedCompletionDate},
				"updatedAt" = NOW() AT TIME ZONE 'America/Mexico_City'
			WHERE id = ${unitId}
		`;

		// Crear evento
		const eventData = {
			estimatedRepairHours,
			estimatedCompletionDate: estimatedCompletionDate.toISOString(),
			updatedById
		};

		await sql`
			INSERT INTO "UnitEvent" ("unitId", "eventType", "eventData", "performedById", "createdAt")
			VALUES (${unitId}, 'REPAIR_TIME_UPDATED', ${sql.json(eventData)}, ${updatedById}, NOW() AT TIME ZONE 'America/Mexico_City')
		`;
	}
}

export const unitRepository = new UnitRepository();
