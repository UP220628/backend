import { unitRepository } from '../repositories/UnitRepository';
import { notificationService } from './NotificationService';
import { broadcastUnitEvent } from '../realtime/unitEventStream';
import { Unit } from '../types';

export class UnitService {
	async listUnits(limit?: number, providerId?: number, plant?: string) {
		return unitRepository.findAll(limit, providerId, plant);
	}

	async listUnitsByStatus(name: string, limit?: number, providerId?: number, plant?: string) {
		return unitRepository.findByStatusName(name, limit, providerId, plant);
	}

	async createUnit(payload: Pick<Unit, 'vin'|'market'|'lane'|'registeredById'|'providerId'|'plant'>, registeredByRoleId?: number) {
		// Check if VIN already exists in the same plant
		const existingUnit = await unitRepository.findByVin(payload.vin, payload.plant);
		if (existingUnit) {
			throw new Error(`Unit with VIN ${payload.vin} already exists${payload.plant ? ` in plant ${payload.plant}` : ''}`);
		}
		
		// Si el usuario que registra es WWS (roleId = 1), la unidad inicia en SENT
		// De lo contrario, inicia en REPORTED (para nivelación)
		const initialStatus = registeredByRoleId === 1 ? 'SENT' : 'REPORTED';
		
		const id = await unitRepository.create(payload, initialStatus);
		const unit = await unitRepository.findById(id);
		if (unit) {
			await notificationService.notifyUnitReported({ id: unit.id, vin: unit.vin });
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event: 'UNIT_REPORTED',
				createdAt: new Date().toISOString(),
			});
			return unit;
		}
		return { id, ...payload } as any;
	}

	async updateUnitStatus(id: number, newStatus: string, changedById: number, estimatedRepairHours?: number, isAvailableToday?: boolean, note?: string, vqaComment?: string) {
		await unitRepository.updateStatus(id, newStatus, changedById, estimatedRepairHours, isAvailableToday, note, vqaComment);
		const unit = await unitRepository.findById(id);
		if (unit) {
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event: 'STATUS_CHANGED',
				createdAt: new Date().toISOString(),
			});
		}
		if (unit && newStatus === 'RELEASED') {
			await notificationService.notifyUnitReleased({ id: unit.id, vin: unit.vin });
		}
		if (unit && newStatus === 'DELIVERED') {
			await notificationService.notifyUnitDelivered({ id: unit.id, vin: unit.vin });
		}
		if (unit && newStatus === 'WWS_RELEASED') {
			await notificationService.notifyUnitWwsReleased({ id: unit.id, vin: unit.vin });
		}
		if (unit && newStatus === 'ACCEPTED') {
			await notificationService.notifyUnitAccepted({ id: unit.id, vin: unit.vin });
		}
		if (unit && newStatus === 'VQA_PENDING') {
			await notificationService.notifyVqaPending({ id: unit.id, vin: unit.vin }, vqaComment);
		}
		return unit;
	}

	async addUnitNote(id: number, noteType: string, note: string, performedById: number) {
		await unitRepository.createNoteEvent(id, noteType, note, performedById);
		const unit = await unitRepository.findById(id);
		if (unit) {
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event: 'NOTE_ADDED',
				createdAt: new Date().toISOString(),
			});
		}
		return unit;
	}

	async updateUnitPriority(id: number, note: string|null, rank: number|null, assignedById: number) {
		await unitRepository.updatePriority(id, note, rank, assignedById);
		const unit = await unitRepository.findById(id);
		if (unit) {
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event: 'PRIORITY_UPDATED',
				createdAt: new Date().toISOString(),
			});
		}
		return unit;
	}

	async reorderUnitPriority(unitIds: number[], assignedById: number) {
		await unitRepository.reorderPriority(unitIds, assignedById);
		// Return the updated list ordered by rank
		const list = await unitRepository.findByStatusName('RECEIVED');
		const filtered = list.filter((u: any) => u.priorityRank != null).sort((a: any, b: any) => (a.priorityRank ?? 9999) - (b.priorityRank ?? 9999));
		
		// Broadcast priority update events for all affected units
		for (const unit of filtered) {
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event: 'PRIORITY_UPDATED',
				createdAt: new Date().toISOString(),
			});
		}
		
		return filtered;
	}

	async addDefectToUnit(
		id: number,
		defectType: string,
		zone: string,
		grade: string,
		registeredById: number,
		description?: string,
		options?: { isFromWws?: boolean; overrideExisting?: boolean; wwsVersion?: string }
	) {
		await unitRepository.createDefect(id, defectType, zone, grade, description ?? null, registeredById, options);
		const unit = await unitRepository.findById(id);
		if (unit) {
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event: 'DEFECT_UPDATED',
				createdAt: new Date().toISOString(),
			});
		}
		return unitRepository.findByIdWithDefects(id);
	}

	async updateDefectGrade(unitId: number, defectId: number, newGrade: string, updatedById: number) {
		await unitRepository.updateDefectGrade(defectId, newGrade, updatedById);
		const unit = await unitRepository.findById(unitId);
		if (unit) {
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event: 'DEFECT_UPDATED',
				createdAt: new Date().toISOString(),
			});
		}
		return unitRepository.findByIdWithDefects(unitId);
	}

	async getDefectStats(todayOnly: boolean = false, plant?: string) {
		return unitRepository.getDefectStats(todayOnly, plant);
	}

	async getTodayUnits(providerId?: number, plant?: string) {
		return unitRepository.getTodayUnits(providerId, plant);
	}

	async setScmDecision(unitId: number, decision: string, note: string | null, decidedById: number) {
		await unitRepository.setScmDecision(unitId, decision, note, decidedById);
		const unit = await unitRepository.findById(unitId);
		if (unit) {
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event: 'SCM_DECISION',
				createdAt: new Date().toISOString(),
			});
		}
		return unit;
	}

	async getStatusStats(plant?: string): Promise<Record<string, number>> {
		return unitRepository.getStatusStats(plant);
	}

	async updateEstimatedRepairTime(id: number, estimatedRepairHours: number, updatedById: number) {
		await unitRepository.updateEstimatedRepairTime(id, estimatedRepairHours, updatedById);
		const unit = await unitRepository.findById(id);
		if (unit) {
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event: 'REPAIR_TIME_UPDATED',
				createdAt: new Date().toISOString(),
			});
		}
		return unit;
	}

	async getUnitsInRepair(providerId?: number, plant?: string) {
		return unitRepository.getUnitsInRepair(providerId, plant);
	}

	async getUnitWithDefects(id: number) {
		return unitRepository.findByIdWithDefects(id);
	}
}

export const unitService = new UnitService();
