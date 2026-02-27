import { unitRepository } from '../repositories/UnitRepository';
import { notificationService } from './NotificationService';
import { broadcastUnitEvent, type UnitEventType } from '../realtime/unitEventStream';
import { Unit } from '../types';
import { ROLE_IDS } from '../constants';

export class UnitService {
	/** Broadcast a unit event via SSE after looking up the unit */
	private async emitEvent(id: number, event: UnitEventType) {
		const unit = await unitRepository.findById(id);
		if (unit) {
			broadcastUnitEvent({
				unitId: unit.id,
				status: unit.statusName,
				event,
				plant: unit.plant ?? undefined,
				createdAt: new Date().toISOString(),
			});
		}
		return unit;
	}

	async listUnits(limit?: number, providerId?: number, plant?: string) {
		return unitRepository.findAll(limit, providerId, plant);
	}

	async listUnitsByStatus(name: string, limit?: number, providerId?: number, plant?: string) {
		return unitRepository.findByStatusName(name, limit, providerId, plant);
	}

	async createUnit(payload: Pick<Unit, 'vin' | 'market' | 'lane' | 'registeredById' | 'providerId' | 'plant'>, registeredByRoleId?: number) {
		// Check if VIN already exists in the same plant
		const existingUnit = await unitRepository.findByVin(payload.vin, payload.plant);
		if (existingUnit) {
			throw new Error(`Unit with VIN ${payload.vin} already exists${payload.plant ? ` in plant ${payload.plant}` : ''}`);
		}

		// Si el usuario que registra es WWS (roleId = 1), la unidad inicia en SENT
		// De lo contrario, inicia en REPORTED (para nivelación)
		const initialStatus = registeredByRoleId === ROLE_IDS.WWS ? 'SENT' : 'REPORTED';

		const id = await unitRepository.create(payload, initialStatus);
		const unit = await this.emitEvent(id, 'UNIT_REPORTED');
		if (unit) {
			await notificationService.notifyUnitReported({ id: unit.id, vin: unit.vin });
			return unit;
		}
		return { id, ...payload } as any;
	}

	async updateUnitStatus(id: number, newStatus: string, changedById: number, estimatedRepairHours?: number, isAvailableToday?: boolean, note?: string, vqaComment?: string) {
		await unitRepository.updateStatus(id, newStatus, changedById, estimatedRepairHours, isAvailableToday, note, vqaComment);
		const unit = await this.emitEvent(id, 'STATUS_CHANGED');

		// Status-specific notifications (map-driven instead of if-chain)
		const notifiers: Record<string, (u: { id: number; vin: string }) => Promise<any>> = {
			RELEASED: (u) => notificationService.notifyUnitReleased(u),
			DELIVERED: (u) => notificationService.notifyUnitDelivered(u),
			WWS_RELEASED: (u) => notificationService.notifyUnitWwsReleased(u),
			ACCEPTED: (u) => notificationService.notifyUnitAccepted(u),
			VQA_PENDING: (u) => notificationService.notifyVqaPending(u, vqaComment),
		};
		if (unit && notifiers[newStatus]) {
			await notifiers[newStatus]({ id: unit.id, vin: unit.vin });
		}

		return unit;
	}

	async addUnitNote(id: number, noteType: string, note: string, performedById: number) {
		await unitRepository.createNoteEvent(id, noteType, note, performedById);
		return this.emitEvent(id, 'NOTE_ADDED');
	}

	async updateUnitPriority(id: number, note: string | null, rank: number | null, assignedById: number) {
		await unitRepository.updatePriority(id, note, rank, assignedById);
		return this.emitEvent(id, 'PRIORITY_UPDATED');
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
				plant: (unit as any).plant ?? undefined,
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
		await this.emitEvent(id, 'DEFECT_UPDATED');
		return unitRepository.findByIdWithDefects(id);
	}

	async updateDefectGrade(unitId: number, defectId: number, newGrade: string, updatedById: number) {
		await unitRepository.updateDefectGrade(defectId, newGrade, updatedById);
		await this.emitEvent(unitId, 'DEFECT_UPDATED');
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
		return this.emitEvent(unitId, 'SCM_DECISION');
	}

	async getStatusStats(plant?: string): Promise<Record<string, number>> {
		return unitRepository.getStatusStats(plant);
	}

	async updateEstimatedRepairTime(id: number, estimatedRepairHours: number, updatedById: number) {
		await unitRepository.updateEstimatedRepairTime(id, estimatedRepairHours, updatedById);
		return this.emitEvent(id, 'REPAIR_TIME_UPDATED');
	}

	async getUnitsInRepair(providerId?: number, plant?: string) {
		return unitRepository.getUnitsInRepair(providerId, plant);
	}

	async getUnitWithDefects(id: number) {
		return unitRepository.findByIdWithDefects(id);
	}
}

export const unitService = new UnitService();
