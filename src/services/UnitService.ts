import { unitRepository } from '../repositories/UnitRepository';
import { notificationService } from './NotificationService';
import { broadcastUnitEvent } from '../realtime/unitEventStream';
import { Unit } from '../types';

export class UnitService {
	async listUnits(limit?: number, providerId?: number) {
		return unitRepository.findAll(limit, providerId);
	}

	async listUnitsByStatus(name: string, limit?: number, providerId?: number) {
		return unitRepository.findByStatusName(name, limit, providerId);
	}

	async createUnit(payload: Pick<Unit, 'vin'|'market'|'lane'|'registeredById'|'providerId'>) {
		// Check if VIN already exists
		const existingUnit = await unitRepository.findByVin(payload.vin);
		if (existingUnit) {
			throw new Error(`Unit with VIN ${payload.vin} already exists`);
		}
		const id = await unitRepository.create(payload);
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

	async updateUnitStatus(id: number, newStatus: string, changedById: number, estimatedRepairHours?: number, isAvailableToday?: boolean, note?: string) {
		await unitRepository.updateStatus(id, newStatus, changedById, estimatedRepairHours, isAvailableToday, note);
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

	async updateUnitPriority(id: number, priority: 'ALTA'|'MEDIA'|'BAJA'|null, note: string|null, rank: number|null, assignedById: number) {
		await unitRepository.updatePriority(id, priority, note, rank, assignedById);
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

	async reorderUnitPriority(priority: 'ALTA'|'MEDIA'|'BAJA', unitIds: number[], assignedById: number) {
		await unitRepository.reorderPriority(priority, unitIds, assignedById);
		// Return the updated list for that priority ordered by rank
		const list = await unitRepository.findByStatusName('RECEIVED');
		const filtered = list.filter((u: any) => u.priority === priority).sort((a: any, b: any) => (a.priorityRank ?? 9999) - (b.priorityRank ?? 9999));
		
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

	async getDefectStats(todayOnly: boolean = false) {
		return unitRepository.getDefectStats(todayOnly);
	}

	async getTodayUnits(providerId?: number) {
		return unitRepository.getTodayUnits(providerId);
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

	async getStatusStats(): Promise<Record<string, number>> {
		return unitRepository.getStatusStats();
	}
}

export const unitService = new UnitService();
