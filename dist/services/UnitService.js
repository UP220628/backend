"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitService = exports.UnitService = void 0;
const UnitRepository_1 = require("../repositories/UnitRepository");
const NotificationService_1 = require("./NotificationService");
const unitEventStream_1 = require("../realtime/unitEventStream");
const constants_1 = require("../constants");
class UnitService {
    /** Broadcast a unit event via SSE after looking up the unit */
    async emitEvent(id, event) {
        const unit = await UnitRepository_1.unitRepository.findById(id);
        if (unit) {
            (0, unitEventStream_1.broadcastUnitEvent)({
                unitId: unit.id,
                status: unit.statusName,
                event,
                plant: unit.plant ?? undefined,
                createdAt: new Date().toISOString(),
            });
        }
        return unit;
    }
    async listUnits(limit, providerId, plant) {
        return UnitRepository_1.unitRepository.findAll(limit, providerId, plant);
    }
    async listUnitsByStatus(name, limit, providerId, plant) {
        return UnitRepository_1.unitRepository.findByStatusName(name, limit, providerId, plant);
    }
    async createUnit(payload, registeredByRoleId) {
        // Check if VIN already exists in the same plant
        const existingUnit = await UnitRepository_1.unitRepository.findByVin(payload.vin, payload.plant);
        if (existingUnit) {
            throw new Error(`Unit with VIN ${payload.vin} already exists${payload.plant ? ` in plant ${payload.plant}` : ''}`);
        }
        // Si el usuario que registra es WWS (roleId = 1), la unidad inicia en SENT
        // De lo contrario, inicia en REPORTED (para nivelación)
        const initialStatus = registeredByRoleId === constants_1.ROLE_IDS.WWS ? 'SENT' : 'REPORTED';
        const id = await UnitRepository_1.unitRepository.create(payload, initialStatus);
        const unit = await this.emitEvent(id, 'UNIT_REPORTED');
        if (unit) {
            await NotificationService_1.notificationService.notifyUnitReported({ id: unit.id, vin: unit.vin });
            return unit;
        }
        return { id, ...payload };
    }
    async updateUnitStatus(id, newStatus, changedById, estimatedRepairHours, isAvailableToday, note, wtyComment) {
        await UnitRepository_1.unitRepository.updateStatus(id, newStatus, changedById, estimatedRepairHours, isAvailableToday, note, wtyComment);
        const unit = await this.emitEvent(id, 'STATUS_CHANGED');
        // Status-specific notifications (map-driven instead of if-chain)
        const notifiers = {
            RELEASED: (u) => NotificationService_1.notificationService.notifyUnitReleased(u),
            DELIVERED: (u) => NotificationService_1.notificationService.notifyUnitDelivered(u),
            WTY_PENDING: (u) => NotificationService_1.notificationService.notifyWtyPending(u, wtyComment),
            WTY_RELEASED: (u) => NotificationService_1.notificationService.notifyWtyReleased(u),
            WWS_RELEASED: (u) => NotificationService_1.notificationService.notifyUnitWwsReleased(u),
            ACCEPTED: (u) => NotificationService_1.notificationService.notifyUnitAccepted(u),
            REJECTED: (u) => NotificationService_1.notificationService.notifyUnitRejected(u, note),
        };
        if (unit && notifiers[newStatus]) {
            await notifiers[newStatus]({ id: unit.id, vin: unit.vin });
        }
        // Auto-return rejected units to SENT (Nivelación WWS) for re-delivery
        if (newStatus === 'REJECTED') {
            // Automatically transition back to SENT, preserving the REJECTED event in history
            await UnitRepository_1.unitRepository.updateStatus(id, 'SENT', changedById);
            const updatedUnit = await this.emitEvent(id, 'STATUS_CHANGED');
            if (updatedUnit) {
                // Notify WWS that a rejected unit needs re-leveling
                await NotificationService_1.notificationService.notifyUnitReturnedToSent({ id: updatedUnit.id, vin: updatedUnit.vin }, note);
            }
            return updatedUnit;
        }
        return unit;
    }
    async addUnitNote(id, noteType, note, performedById) {
        await UnitRepository_1.unitRepository.createNoteEvent(id, noteType, note, performedById);
        return this.emitEvent(id, 'NOTE_ADDED');
    }
    async updateUnitPriority(id, note, rank, assignedById) {
        await UnitRepository_1.unitRepository.updatePriority(id, note, rank, assignedById);
        return this.emitEvent(id, 'PRIORITY_UPDATED');
    }
    async reorderUnitPriority(unitIds, assignedById) {
        await UnitRepository_1.unitRepository.reorderPriority(unitIds, assignedById);
        // Return the updated list ordered by rank
        const list = await UnitRepository_1.unitRepository.findByStatusName('RECEIVED');
        const filtered = list.filter((u) => u.priorityRank != null).sort((a, b) => (a.priorityRank ?? 9999) - (b.priorityRank ?? 9999));
        // Broadcast priority update events for all affected units
        for (const unit of filtered) {
            (0, unitEventStream_1.broadcastUnitEvent)({
                unitId: unit.id,
                status: unit.statusName,
                event: 'PRIORITY_UPDATED',
                plant: unit.plant ?? undefined,
                createdAt: new Date().toISOString(),
            });
        }
        return filtered;
    }
    async addDefectToUnit(id, defectType, zone, grade, registeredById, description, options) {
        await UnitRepository_1.unitRepository.createDefect(id, defectType, zone, grade, description ?? null, registeredById, options);
        await this.emitEvent(id, 'DEFECT_UPDATED');
        return UnitRepository_1.unitRepository.findByIdWithDefects(id);
    }
    async updateDefectGrade(unitId, defectId, newGrade, updatedById) {
        await UnitRepository_1.unitRepository.updateDefectGrade(defectId, newGrade, updatedById);
        await this.emitEvent(unitId, 'DEFECT_UPDATED');
        return UnitRepository_1.unitRepository.findByIdWithDefects(unitId);
    }
    async getDefectStats(todayOnly = false, plant) {
        return UnitRepository_1.unitRepository.getDefectStats(todayOnly, plant);
    }
    async getTodayUnits(providerId, plant) {
        return UnitRepository_1.unitRepository.getTodayUnits(providerId, plant);
    }
    async setScmDecision(unitId, decision, note, decidedById) {
        await UnitRepository_1.unitRepository.setScmDecision(unitId, decision, note, decidedById);
        return this.emitEvent(unitId, 'SCM_DECISION');
    }
    async getStatusStats(plant) {
        return UnitRepository_1.unitRepository.getStatusStats(plant);
    }
    async updateEstimatedRepairTime(id, estimatedRepairHours, updatedById) {
        await UnitRepository_1.unitRepository.updateEstimatedRepairTime(id, estimatedRepairHours, updatedById);
        return this.emitEvent(id, 'REPAIR_TIME_UPDATED');
    }
    async getUnitsInRepair(providerId, plant) {
        return UnitRepository_1.unitRepository.getUnitsInRepair(providerId, plant);
    }
    async getUnitWithDefects(id) {
        return UnitRepository_1.unitRepository.findByIdWithDefects(id);
    }
    async archiveUnit(unitId, archivedById) {
        await UnitRepository_1.unitRepository.archiveUnit(unitId, archivedById);
        const unit = await this.emitEvent(unitId, 'STATUS_CHANGED');
        if (unit) {
            await NotificationService_1.notificationService.notifyUnitArchived({ id: unit.id, vin: unit.vin });
        }
        return unit;
    }
    async getArchivableUnits(plant) {
        return UnitRepository_1.unitRepository.getArchivableUnits(plant);
    }
}
exports.UnitService = UnitService;
exports.unitService = new UnitService();
//# sourceMappingURL=UnitService.js.map