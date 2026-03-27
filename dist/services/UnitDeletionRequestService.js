"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitDeletionRequestService = exports.UnitDeletionRequestService = void 0;
const constants_1 = require("../constants");
const unitEventStream_1 = require("../realtime/unitEventStream");
const UnitDeletionRequestRepository_1 = require("../repositories/UnitDeletionRequestRepository");
const UnitRepository_1 = require("../repositories/UnitRepository");
const UserRepository_1 = require("../repositories/UserRepository");
const NotificationService_1 = require("./NotificationService");
class UnitDeletionRequestService {
    validateReason(reason) {
        if (reason.length < 15 || reason.length > 500) {
            throw new Error('Reason must be between 15 and 500 characters');
        }
    }
    async requestDeletion(unitId, requestedById, reason) {
        this.validateReason(reason);
        const unit = await UnitRepository_1.unitRepository.findById(unitId);
        if (!unit) {
            throw new Error('Unit not found');
        }
        const existingPending = await UnitDeletionRequestRepository_1.unitDeletionRequestRepository.findPendingByUnitId(unitId);
        if (existingPending) {
            throw new Error('There is already a pending deletion request for this unit');
        }
        const created = await UnitDeletionRequestRepository_1.unitDeletionRequestRepository.create(unitId, requestedById, reason);
        const requester = await UserRepository_1.userRepository.findById(requestedById);
        const roleLabelById = {
            [constants_1.ROLE_IDS.CARRIER]: 'Carrier',
            [constants_1.ROLE_IDS.WWS]: 'WWS',
        };
        const requesterRole = roleLabelById[requester?.roleId ?? 0] ?? 'Usuario';
        const requesterLabel = requester?.name ? `${requester.name} (${requesterRole})` : requesterRole;
        (0, unitEventStream_1.broadcastUnitEvent)({
            unitId,
            status: unit.statusName,
            event: 'UNIT_DELETION_REQUESTED',
            plant: unit.plant ?? undefined,
            createdAt: new Date().toISOString(),
        });
        await NotificationService_1.notificationService.notifyUnitDeletionRequested({ id: unit.id, vin: unit.vin }, reason, requesterLabel);
        return created;
    }
    async listRequests(status, plant) {
        const normalized = status.toUpperCase();
        if (normalized !== 'PENDING' && normalized !== 'APPROVED' && normalized !== 'REJECTED') {
            throw new Error('Invalid status. Use PENDING, APPROVED or REJECTED');
        }
        return UnitDeletionRequestRepository_1.unitDeletionRequestRepository.listByStatus(normalized, plant);
    }
    async decideRequest(requestId, decision, decisionNote, decidedById) {
        if (decision === 'REJECT') {
            const request = await UnitDeletionRequestRepository_1.unitDeletionRequestRepository.findById(requestId);
            if (!request) {
                throw new Error('Deletion request not found');
            }
            const rejected = await UnitDeletionRequestRepository_1.unitDeletionRequestRepository.reject(requestId, decisionNote, decidedById);
            (0, unitEventStream_1.broadcastUnitEvent)({
                unitId: request.unitId,
                status: request.status,
                event: 'UNIT_DELETION_DECIDED',
                plant: request.plant ?? undefined,
                createdAt: new Date().toISOString(),
            });
            await NotificationService_1.notificationService.notifyUnitDeletionRejected({ id: request.unitId, vin: request.vin }, request.requestedById, decisionNote);
            return rejected;
        }
        const approved = await UnitDeletionRequestRepository_1.unitDeletionRequestRepository.approveAndDeleteUnit(requestId, decidedById);
        (0, unitEventStream_1.broadcastUnitEvent)({
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
exports.UnitDeletionRequestService = UnitDeletionRequestService;
exports.unitDeletionRequestService = new UnitDeletionRequestService();
//# sourceMappingURL=UnitDeletionRequestService.js.map