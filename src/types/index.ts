export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  roleId: number;
  providerId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: number;
  name: 'WWS' | 'SCM' | 'BODY' | 'CARRIER';
}

export interface Provider {
  id: number;
  name: string;
  code?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitStatus {
  id: number;
  name: 'SENT' | 'DELIVERED' | 'RECEIVED' | 'IN_REPAIR' | 'RELEASED' | 'WWS_RELEASED' | 'ACCEPTED' | 'UNAVAILABLE' | 'VQA_PENDING';
}

export interface DefectGrade {
  id: number;
  code: 'V1' | 'V2' | 'V3';
  description: string;
}

export interface RepairCatalog {
  id: number;
  defectType: string;
  zone: string;
  gradeId: number;
  estimatedHours: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Unit {
  id: number;
  vin: string;
  market: string;
  lane: string;
  statusId: number;
  isAvailableToday: boolean;
  registeredById: number;
  providerId?: number;
  estimatedRepairHours?: number;
  estimatedCompletionDate?: Date;
  vqaComment?: string | null;
  // Priority fields
  priorityNote?: string;
  priorityRank?: number;
  priorityAssignedById?: number;
  priorityAssignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitDefect {
  id: number;
  unitId: number;
  defectType: string;
  zone: string;
  gradeId: number;
  description?: string;
  repairCatalogId?: number;
  registeredById: number;
  isResolved: boolean;
  isActive?: boolean;
  overriddenByWws?: boolean;
  wwsVersion?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitStatusHistory {
  id: number;
  unitId: number;
  previousStatusId?: number;
  newStatusId: number;
  changedById: number;
  changedAt: Date;
}

export interface Notification {
  id: number;
  userId: number;
  unitId: number;
  type: 'UNIT_REPORTED' | 'UNIT_RELEASED' | 'UNIT_DELIVERED' | 'UNIT_WWS_RELEASED' | 'UNIT_ACCEPTED' | 'STATUS_CHANGED' | 'DEFECT_ADDED' | 'REPAIR_ESTIMATED' | 'VQA_PENDING';
  message: string | null;
  isRead: boolean;
  createdAt: Date;
}


export interface CreateUnitDTO {
  vin: string;
  market: string;
  lane: string;
  defects?: CreateDefectDTO[];
}

export interface CreateDefectDTO {
  defectType: string;
  zone: string;
  gradeId: number;
  description?: string;
}

export interface UpdateDefectDTO {
  defectType?: string;
  zone?: string;
  gradeId?: number;
  description?: string;
}

export interface UpdateUnitStatusDTO {
  newStatusId: number;
  changedById: number;
}

export interface UpdateEstimatedRepairDTO {
  estimatedRepairHours: number;
  estimatedCompletionDate?: Date;
}

export interface ResolveDefectDTO {
  defectId: number;
  resolvedById: number;
}

export interface CreateRepairCatalogDTO {
  defectType: string;
  zone: string;
  gradeId: number;
  estimatedHours: number;
  description?: string;
}

export interface CreateNotificationDTO {
  userId: number;
  unitId: number;
  type: 'UNIT_REPORTED' | 'UNIT_RELEASED' | 'UNIT_DELIVERED' | 'UNIT_WWS_RELEASED' | 'UNIT_ACCEPTED' | 'STATUS_CHANGED' | 'DEFECT_ADDED' | 'REPAIR_ESTIMATED' | 'VQA_PENDING';
  message: string;
}

export interface MarkNotificationReadDTO {
  notificationId: number;
  userId: number;
}

export interface GetUnitsQueryDTO {
  statusId?: number;
  registeredById?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GetNotificationsQueryDTO {
  userId: number;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterUserDTO {
  email: string;
  password: string;
  name: string;
  roleId: number;
  providerId?: number;
}