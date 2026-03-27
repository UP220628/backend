import { ROLE_IDS } from '../constants';
import { broadcastUnitEvent } from '../realtime/unitEventStream';
import { unitDeletionRequestRepository } from '../repositories/UnitDeletionRequestRepository';
import { unitRepository } from '../repositories/UnitRepository';
import { userRepository } from '../repositories/UserRepository';
import { notificationService } from './NotificationService';

export class UnitDeletionRequestService {
	private validateReason(reason: string) {
		if (reason.length < 15 || reason.length > 500) {
			throw new Error('Reason must be between 15 and 500 characters');
		}
	}

	async requestDeletion(unitId: number, requestedById: number, reason: string) {
		this.validateReason(reason);

		const unit = await unitRepository.findById(unitId);
		if (!unit) {
			throw new Error('Unit not found');
		}

		const existingPending = await unitDeletionRequestRepository.findPendingByUnitId(unitId);
		if (existingPending) {
			throw new Error('There is already a pending deletion request for this unit');
		}

		const created = await unitDeletionRequestRepository.create(unitId, requestedById, reason);
		const requester = await userRepository.findById(requestedById);
		const roleLabelById: Record<number, string> = {
			[ROLE_IDS.CARRIER]: 'Carrier',
			[ROLE_IDS.WWS]: 'WWS',
		};
		const requesterRole = roleLabelById[requester?.roleId ?? 0] ?? 'Usuario';
		const requesterLabel = requester?.name ? `${requester.name} (${requesterRole})` : requesterRole;
		broadcastUnitEvent({
			unitId,
			status: unit.statusName,
			event: 'UNIT_DELETION_REQUESTED',
			plant: unit.plant ?? undefined,
			createdAt: new Date().toISOString(),
		});

		await notificationService.notifyUnitDeletionRequested(
			{ id: unit.id, vin: unit.vin },
			reason,
			requesterLabel
		);

		return created;
	}

	async listRequests(status: string, plant?: string) {
		const normalized = status.toUpperCase();
		if (normalized !== 'PENDING' && normalized !== 'APPROVED' && normalized !== 'REJECTED') {
			throw new Error('Invalid status. Use PENDING, APPROVED or REJECTED');
		}
		return unitDeletionRequestRepository.listByStatus(normalized as any, plant);
	}

	async decideRequest(requestId: number, decision: 'APPROVE' | 'REJECT', decisionNote: string | null, decidedById: number) {
		if (decision === 'REJECT') {
			const request = await unitDeletionRequestRepository.findById(requestId);
			if (!request) {
				throw new Error('Deletion request not found');
			}

			const rejected = await unitDeletionRequestRepository.reject(requestId, decisionNote, decidedById);
			broadcastUnitEvent({
				unitId: request.unitId,
				status: request.status,
				event: 'UNIT_DELETION_DECIDED',
				plant: request.plant ?? undefined,
				createdAt: new Date().toISOString(),
			});

			await notificationService.notifyUnitDeletionRejected(
				{ id: request.unitId, vin: request.vin },
				request.requestedById,
				decisionNote
			);

			return rejected;
		}

		const approved = await unitDeletionRequestRepository.approveAndDeleteUnit(requestId, decidedById);

		broadcastUnitEvent({
			unitId: approved.unitId,
			status: 'DELETED',
			event: 'UNIT_DELETION_DECIDED',
			plant: approved.plant ?? undefined,
			createdAt: new Date().toISOString(),
		});

		return {
			requestId,
			unitId: approved.unitId,
			status: 'APPROVED',
		};
	}
}

export const unitDeletionRequestService = new UnitDeletionRequestService();
