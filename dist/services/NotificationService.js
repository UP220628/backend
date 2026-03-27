"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const NotificationRepository_1 = require("../repositories/NotificationRepository");
const UnitRepository_1 = require("../repositories/UnitRepository");
const UserRepository_1 = require("../repositories/UserRepository");
const notificationHub_1 = require("../realtime/notificationHub");
const constants_1 = require("../constants");
class NotificationService {
    async createForUserIds(userIds, unitId, type, message) {
        if (userIds.length === 0)
            return [];
        const payload = userIds.map(userId => ({
            userId,
            unitId,
            type,
            message,
        }));
        const created = await NotificationRepository_1.notificationRepository.createMany(payload);
        (0, notificationHub_1.broadcastNotifications)(created);
        return created;
    }
    async createForRoleIds(roleIds, unitId, type, message, options) {
        // Get the unit's plant to filter notification recipients
        const unit = await UnitRepository_1.unitRepository.findById(unitId);
        const unitPlant = unit?.plant ?? undefined;
        const users = await UserRepository_1.userRepository.findByRoleIds(roleIds, unitPlant);
        if (users.length === 0)
            return [];
        const filteredUsers = users.filter(user => {
            if (user.roleId !== constants_1.ROLE_IDS.CARRIER)
                return true;
            if (!options || options.carrierProviderId === undefined || options.carrierProviderId === null) {
                return false;
            }
            return user.providerId === options.carrierProviderId;
        });
        if (filteredUsers.length === 0)
            return [];
        const payload = filteredUsers.map(user => ({
            userId: user.id,
            unitId,
            type,
            message,
        }));
        const created = await NotificationRepository_1.notificationRepository.createMany(payload);
        (0, notificationHub_1.broadcastNotifications)(created);
        return created;
    }
    async notifyUnitReported(unit) {
        const message = `Unidad reportada por carrier. VIN: ${unit.vin}`;
        return this.createForRoleIds([constants_1.ROLE_IDS.WWS, constants_1.ROLE_IDS.SCM, constants_1.ROLE_IDS.BODY], unit.id, 'UNIT_REPORTED', message);
    }
    async notifyUnitReleased(unit) {
        const message = `Unidad liberada en BODY. VIN: ${unit.vin}`;
        const carrierProviderId = await UnitRepository_1.unitRepository.getRegisteredByProviderId(unit.id);
        return this.createForRoleIds([constants_1.ROLE_IDS.WWS, constants_1.ROLE_IDS.SCM, constants_1.ROLE_IDS.CARRIER], unit.id, 'UNIT_RELEASED', message, { carrierProviderId });
    }
    async notifyUnitDelivered(unit) {
        const message = `Unidad entregada a Body por WWS. VIN: ${unit.vin}`;
        return this.createForRoleIds([constants_1.ROLE_IDS.BODY, constants_1.ROLE_IDS.SCM], unit.id, 'UNIT_DELIVERED', message);
    }
    async notifyUnitWwsReleased(unit) {
        const message = `Unidad liberada por WWS. VIN: ${unit.vin}`;
        const carrierProviderId = await UnitRepository_1.unitRepository.getRegisteredByProviderId(unit.id);
        return this.createForRoleIds([constants_1.ROLE_IDS.CARRIER, constants_1.ROLE_IDS.SCM], unit.id, 'UNIT_WWS_RELEASED', message, { carrierProviderId });
    }
    async notifyUnitAccepted(unit) {
        const message = `Unidad aceptada por Carrier. VIN: ${unit.vin}`;
        return this.createForRoleIds([constants_1.ROLE_IDS.WWS, constants_1.ROLE_IDS.SCM, constants_1.ROLE_IDS.BODY], unit.id, 'UNIT_ACCEPTED', message);
    }
    async notifyWtyPending(unit, comment) {
        const msg = comment
            ? `Unidad enviada a validación WTY. VIN: ${unit.vin} — Comentario WWS: ${comment}`
            : `Unidad enviada a validación WTY. VIN: ${unit.vin}`;
        return this.createForRoleIds([constants_1.ROLE_IDS.WTY, constants_1.ROLE_IDS.SCM_QUALITY, constants_1.ROLE_IDS.SCM], unit.id, 'WTY_PENDING', msg);
    }
    async notifyWtyReleased(unit) {
        const message = `Unidad aprobada por WTY y lista para liberación WWS. VIN: ${unit.vin}`;
        return this.createForRoleIds([constants_1.ROLE_IDS.WWS, constants_1.ROLE_IDS.SCM], unit.id, 'WTY_RELEASED', message);
    }
    async notifyUnitRejected(unit, note) {
        const msg = note
            ? `Unidad rechazada por Carrier. VIN: ${unit.vin} — Motivo: ${note}`
            : `Unidad rechazada por Carrier. VIN: ${unit.vin}`;
        return this.createForRoleIds([constants_1.ROLE_IDS.WWS, constants_1.ROLE_IDS.SCM, constants_1.ROLE_IDS.BODY], unit.id, 'UNIT_REJECTED', msg);
    }
    async notifyUnitReturnedToSent(unit, rejectionNote) {
        const msg = rejectionNote
            ? `Unidad rechazada regresada a Nivelación WWS. VIN: ${unit.vin} — Motivo: ${rejectionNote}`
            : `Unidad rechazada regresada a Nivelación WWS para re-entrega. VIN: ${unit.vin}`;
        return this.createForRoleIds([constants_1.ROLE_IDS.WWS, constants_1.ROLE_IDS.SCM], unit.id, 'UNIT_RETURNED_TO_SENT', msg);
    }
    async notifyUnitArchived(unit) {
        const message = `Unidad archivada (no disponible). VIN: ${unit.vin}`;
        return this.createForRoleIds([constants_1.ROLE_IDS.SCM, constants_1.ROLE_IDS.WWS], unit.id, 'UNIT_ARCHIVED', message);
    }
    async notifyUnitDeletionRequested(unit, reason, requestedByLabel) {
        const message = `Solicitud de borrado enviada por ${requestedByLabel}. VIN: ${unit.vin} — Justificacion: ${reason}`;
        return this.createForRoleIds([constants_1.ROLE_IDS.SCM], unit.id, 'UNIT_DELETION_REQUESTED', message);
    }
    async notifyUnitDeletionApproved(unit, requesterUserId, reason) {
        const msg = reason
            ? `SCM aprobo y borro la unidad solicitada. VIN: ${unit.vin} — Justificacion original: ${reason}`
            : `SCM aprobo y borro la unidad solicitada. VIN: ${unit.vin}`;
        return this.createForUserIds([requesterUserId], unit.id, 'UNIT_DELETION_APPROVED', msg);
    }
    async notifyUnitDeletionRejected(unit, requesterUserId, decisionNote) {
        const msg = decisionNote
            ? `SCM rechazo la solicitud de borrado. VIN: ${unit.vin} — Comentario: ${decisionNote}`
            : `SCM rechazo la solicitud de borrado. VIN: ${unit.vin}`;
        return this.createForUserIds([requesterUserId], unit.id, 'UNIT_DELETION_REJECTED', msg);
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
//# sourceMappingURL=NotificationService.js.map