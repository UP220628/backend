"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArchivableUnits = exports.archiveUnit = exports.getUnitById = exports.getUnitsInRepair = exports.updateEstimatedRepairTime = exports.getStatusStats = exports.setScmDecision = exports.getTodayUnits = exports.updateDefectGrade = exports.addDefectToUnit = exports.updatePriorityOrder = exports.updateUnitPriority = exports.updateUnitStatus = exports.createUnit = exports.getDefectStats = exports.listUnits = void 0;
const UnitService_1 = require("../services/UnitService");
const asyncHandler_1 = require("../utils/asyncHandler");
const helpers_1 = require("../utils/helpers");
const constants_1 = require("../constants");
exports.listUnits = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const providerId = (0, helpers_1.getCarrierProviderId)(user);
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const data = status
        ? await UnitService_1.unitService.listUnitsByStatus(status, limit, providerId, plant)
        : await UnitService_1.unitService.listUnits(limit, providerId, plant);
    res.json({ ok: true, data });
});
exports.getDefectStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const filterToday = req.query.filter === 'today';
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const stats = await UnitService_1.unitService.getDefectStats(filterToday, plant);
    res.json({ ok: true, data: stats });
});
exports.createUnit = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const { vin, market, lane, registeredById, providerId, plant } = req.body || {};
    if (!vin || !market || !lane || !registeredById) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    // Determinar el providerId:
    // 1. Si viene providerId en el body (WWS reportando), usar ese
    // 2. Si el usuario es CARRIER y tiene providerId, usar el del usuario
    // 3. Si no, dejar null
    let finalProviderId = providerId;
    if (!finalProviderId && user?.roleId === constants_1.ROLE_IDS.CARRIER && user.providerId) {
        finalProviderId = user.providerId;
    }
    // Determinar la planta:
    // 1. Si viene plant en el body, usar ese (solo ADMIN puede especificar cualquier planta)
    // 2. Si el usuario tiene plant asignado, usar el del usuario
    // 3. Si no, dejar null
    let finalPlant = plant;
    if (!finalPlant && user?.plant) {
        finalPlant = user.plant;
    }
    // Validar que no-admin no pueda crear en otra planta
    if (user?.roleId !== constants_1.ROLE_IDS.ADMIN && user?.plant && plant && plant !== user.plant) {
        return res.status(403).json({ ok: false, error: 'Cannot create units in a different plant' });
    }
    const unit = await UnitService_1.unitService.createUnit({ vin, market, lane, registeredById, providerId: finalProviderId, plant: finalPlant }, user?.roleId);
    res.status(201).json({ ok: true, data: unit });
});
exports.updateUnitStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = Number(req.params.id);
    const { newStatus, changedById, estimatedRepairHours, isAvailableToday, note, wtyComment } = req.body || {};
    if (!id || !newStatus || !changedById) {
        return res.status(400).json({ ok: false, error: 'Missing id, newStatus or changedById' });
    }
    const unit = await UnitService_1.unitService.updateUnitStatus(id, newStatus, Number(changedById), estimatedRepairHours, isAvailableToday, note, wtyComment);
    res.json({ ok: true, data: unit });
});
exports.updateUnitPriority = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = Number(req.params.id);
    const { note, rank, assignedById } = req.body || {};
    if (!id || !assignedById) {
        return res.status(400).json({ ok: false, error: 'Missing id or assignedById' });
    }
    const unit = await UnitService_1.unitService.updateUnitPriority(id, note ?? null, typeof rank === 'number' ? rank : null, Number(assignedById));
    res.json({ ok: true, data: unit });
});
exports.updatePriorityOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { unitIds, assignedById } = req.body || {};
    if (!Array.isArray(unitIds) || unitIds.length === 0 || !assignedById) {
        return res.status(400).json({ ok: false, error: 'Missing unitIds or assignedById' });
    }
    const data = await UnitService_1.unitService.reorderUnitPriority(unitIds.map(Number), Number(assignedById));
    res.json({ ok: true, data });
});
exports.addDefectToUnit = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = Number(req.params.id);
    const { defectType, zone, grade, registeredById, description, isFromWws, overrideExisting, wwsVersion } = req.body || {};
    if (!id || !defectType || !zone || !grade || !registeredById) {
        return res.status(400).json({ ok: false, error: 'Missing id, defectType, zone, grade or registeredById' });
    }
    if (!constants_1.VALID_GRADES.includes(grade)) {
        return res.status(400).json({ ok: false, error: `Invalid grade. Use ${constants_1.VALID_GRADES.join('|')}.` });
    }
    const options = {
        isFromWws: !!isFromWws,
        overrideExisting: !!overrideExisting,
        wwsVersion: typeof wwsVersion === 'string' ? wwsVersion : undefined,
    };
    const unit = await UnitService_1.unitService.addDefectToUnit(id, defectType, zone, grade, Number(registeredById), description, options);
    res.status(201).json({ ok: true, data: unit });
});
exports.updateDefectGrade = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const unitId = Number(req.params.id);
    const defectId = Number(req.params.defectId);
    const { grade, updatedById } = req.body || {};
    if (!unitId || !defectId || !grade || !updatedById) {
        return res.status(400).json({ ok: false, error: 'Missing unitId, defectId, grade or updatedById' });
    }
    if (!constants_1.VALID_GRADES.includes(grade)) {
        return res.status(400).json({ ok: false, error: `Invalid grade. Use ${constants_1.VALID_GRADES.join('|')}.` });
    }
    const unit = await UnitService_1.unitService.updateDefectGrade(unitId, defectId, grade, Number(updatedById));
    res.json({ ok: true, data: unit });
});
exports.getTodayUnits = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const providerId = (0, helpers_1.getCarrierProviderId)(user);
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const data = await UnitService_1.unitService.getTodayUnits(providerId, plant);
    res.json({ ok: true, data });
});
exports.setScmDecision = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const unitId = Number(req.params.id);
    const { decision, note, decidedById } = req.body || {};
    if (!unitId || !decision || !decidedById) {
        return res.status(400).json({ ok: false, error: 'Missing unitId, decision or decidedById' });
    }
    if (!constants_1.VALID_SCM_DECISIONS.includes(decision)) {
        return res.status(400).json({ ok: false, error: `Invalid decision. Use ${constants_1.VALID_SCM_DECISIONS.join('|')}` });
    }
    const unit = await UnitService_1.unitService.setScmDecision(unitId, decision, note || null, Number(decidedById));
    res.json({ ok: true, data: unit });
});
exports.getStatusStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const stats = await UnitService_1.unitService.getStatusStats(plant);
    res.json({ ok: true, data: stats });
});
exports.updateEstimatedRepairTime = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = Number(req.params.id);
    const { estimatedRepairHours, updatedById } = req.body || {};
    if (!id || !estimatedRepairHours || !updatedById) {
        return res.status(400).json({ ok: false, error: 'Missing id, estimatedRepairHours or updatedById' });
    }
    const unit = await UnitService_1.unitService.updateEstimatedRepairTime(id, Number(estimatedRepairHours), Number(updatedById));
    res.json({ ok: true, data: unit });
});
exports.getUnitsInRepair = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const providerId = (0, helpers_1.getCarrierProviderId)(user);
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const includeArchived = req.query.includeArchived === 'true';
    const units = await UnitService_1.unitService.getUnitsInRepair(providerId, plant, includeArchived);
    res.json({ ok: true, data: units });
});
exports.getUnitById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) {
        return res.status(400).json({ ok: false, error: 'Missing unit id' });
    }
    const unit = await UnitService_1.unitService.getUnitWithDefects(id);
    if (!unit) {
        return res.status(404).json({ ok: false, error: 'Unit not found' });
    }
    res.json({ ok: true, data: unit });
});
exports.archiveUnit = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = Number(req.params.id);
    const user = res.locals.user;
    const archivedById = Number(user?.userId);
    if (!id || !archivedById) {
        return res.status(400).json({ ok: false, error: 'Missing id or authenticated user' });
    }
    const unit = await UnitService_1.unitService.archiveUnit(id, archivedById);
    res.json({ ok: true, data: unit });
});
exports.getArchivableUnits = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const data = await UnitService_1.unitService.getArchivableUnits(plant);
    res.json({ ok: true, data });
});
//# sourceMappingURL=UnitController.js.map