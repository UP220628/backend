import { notificationRepository } from '../repositories/NotificationRepository';
import { unitRepository } from '../repositories/UnitRepository';
import { userRepository } from '../repositories/UserRepository';
import { broadcastNotifications } from '../realtime/notificationHub';
import type { Notification } from '../types';
import { ROLE_IDS } from '../constants';

export class NotificationService {
  private async createForRoleIds(
    roleIds: number[],
    unitId: number,
    type: Notification['type'],
    message: string,
    options?: { carrierProviderId?: number | null }
  ) {
    // Get the unit's plant to filter notification recipients
    const unit = await unitRepository.findById(unitId);
    const unitPlant = unit?.plant ?? undefined;

    const users = await userRepository.findByRoleIds(roleIds, unitPlant);
    if (users.length === 0) return [];

    const filteredUsers = users.filter(user => {
      if (user.roleId !== ROLE_IDS.CARRIER) return true;
      if (!options || options.carrierProviderId === undefined || options.carrierProviderId === null) {
        return false;
      }
      return user.providerId === options.carrierProviderId;
    });

    if (filteredUsers.length === 0) return [];

    const payload = filteredUsers.map(user => ({
      userId: user.id,
      unitId,
      type,
      message,
    }));

    const created = await notificationRepository.createMany(payload);
    broadcastNotifications(created);
    return created;
  }

  async notifyUnitReported(unit: { id: number; vin: string }) {
    const message = `Unidad reportada por carrier. VIN: ${unit.vin}`;
    return this.createForRoleIds([ROLE_IDS.WWS, ROLE_IDS.SCM, ROLE_IDS.BODY], unit.id, 'UNIT_REPORTED', message);
  }

  async notifyUnitReleased(unit: { id: number; vin: string }) {
    const message = `Unidad liberada en BODY. VIN: ${unit.vin}`;
    const carrierProviderId = await unitRepository.getRegisteredByProviderId(unit.id);
    return this.createForRoleIds(
      [ROLE_IDS.WWS, ROLE_IDS.SCM, ROLE_IDS.CARRIER],
      unit.id,
      'UNIT_RELEASED',
      message,
      { carrierProviderId }
    );
  }

  async notifyUnitDelivered(unit: { id: number; vin: string }) {
    const message = `Unidad entregada a Body por WWS. VIN: ${unit.vin}`;
    return this.createForRoleIds([ROLE_IDS.BODY, ROLE_IDS.SCM], unit.id, 'UNIT_DELIVERED', message);
  }

  async notifyUnitWwsReleased(unit: { id: number; vin: string }) {
    const message = `Unidad liberada por WWS. VIN: ${unit.vin}`;
    const carrierProviderId = await unitRepository.getRegisteredByProviderId(unit.id);
    return this.createForRoleIds(
      [ROLE_IDS.CARRIER, ROLE_IDS.SCM],
      unit.id,
      'UNIT_WWS_RELEASED',
      message,
      { carrierProviderId }
    );
  }

  async notifyUnitAccepted(unit: { id: number; vin: string }) {
    const message = `Unidad aceptada por Carrier. VIN: ${unit.vin}`;
    return this.createForRoleIds([ROLE_IDS.WWS, ROLE_IDS.SCM, ROLE_IDS.BODY], unit.id, 'UNIT_ACCEPTED', message);
  }

  async notifyVqaPending(unit: { id: number; vin: string }, comment?: string | null) {
    const msg = comment
      ? `Unidad enviada a validación VQA. VIN: ${unit.vin} — Comentario WWS: ${comment}`
      : `Unidad enviada a validación VQA. VIN: ${unit.vin}`;
    return this.createForRoleIds([ROLE_IDS.VQA, ROLE_IDS.SCM], unit.id, 'VQA_PENDING', msg);
  }

  async notifyUnitRejected(unit: { id: number; vin: string }, note?: string | null) {
    const msg = note
      ? `Unidad rechazada por Carrier. VIN: ${unit.vin} — Motivo: ${note}`
      : `Unidad rechazada por Carrier. VIN: ${unit.vin}`;
    return this.createForRoleIds([ROLE_IDS.WWS, ROLE_IDS.SCM, ROLE_IDS.BODY], unit.id, 'UNIT_REJECTED', msg);
  }

  async notifyUnitArchived(unit: { id: number; vin: string }) {
    const message = `Unidad archivada (no disponible). VIN: ${unit.vin}`;
    return this.createForRoleIds([ROLE_IDS.SCM, ROLE_IDS.WWS], unit.id, 'UNIT_ARCHIVED', message);
  }
}

export const notificationService = new NotificationService();
