import { Request, Response } from 'express';
import { unitService } from '../services/UnitService';
import { asyncHandler } from '../utils/asyncHandler';
import { getCarrierProviderId, getUserPlantFilter } from '../utils/helpers';
import { ROLE_IDS, VALID_GRADES, VALID_SCM_DECISIONS } from '../constants';

export const listUnits = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const limit = req.query.limit ? Number(req.query.limit) : undefined;
	const status = typeof req.query.status === 'string' ? req.query.status : undefined;
	const providerId = getCarrierProviderId(user);
	const plant = getUserPlantFilter(user);
	
	const data = status 
		? await unitService.listUnitsByStatus(status, limit, providerId, plant) 
		: await unitService.listUnits(limit, providerId, plant);
	res.json({ ok: true, data });
});

export const getDefectStats = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const filterToday = req.query.filter === 'today';
	const plant = getUserPlantFilter(user);
	const stats = await unitService.getDefectStats(filterToday, plant);
	res.json({ ok: true, data: stats });
});

export const createUnit = asyncHandler(async (req: Request, res: Response) => {
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
	if (!finalProviderId && user?.roleId === ROLE_IDS.CARRIER && user.providerId) {
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
	if (user?.roleId !== ROLE_IDS.ADMIN && user?.plant && plant && plant !== user.plant) {
		return res.status(403).json({ ok: false, error: 'Cannot create units in a different plant' });
	}
	
	const unit = await unitService.createUnit({ vin, market, lane, registeredById, providerId: finalProviderId, plant: finalPlant }, user?.roleId);
	res.status(201).json({ ok: true, data: unit });
});

export const updateUnitStatus = asyncHandler(async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const { newStatus, changedById, estimatedRepairHours, isAvailableToday, note, wtyComment } = req.body || {};
	if (!id || !newStatus || !changedById) {
		return res.status(400).json({ ok: false, error: 'Missing id, newStatus or changedById' });
	}
	const unit = await unitService.updateUnitStatus(id, newStatus, Number(changedById), estimatedRepairHours, isAvailableToday, note, wtyComment);
	res.json({ ok: true, data: unit });
});

export const updateUnitPriority = asyncHandler(async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const { note, rank, assignedById } = req.body || {};
	if (!id || !assignedById) {
		return res.status(400).json({ ok: false, error: 'Missing id or assignedById' });
	}
	const unit = await unitService.updateUnitPriority(
		id,
		note ?? null,
		typeof rank === 'number' ? rank : null,
		Number(assignedById)
	);
	res.json({ ok: true, data: unit });
});

export const updatePriorityOrder = asyncHandler(async (req: Request, res: Response) => {
	const { unitIds, assignedById } = req.body || {};
	if (!Array.isArray(unitIds) || unitIds.length === 0 || !assignedById) {
		return res.status(400).json({ ok: false, error: 'Missing unitIds or assignedById' });
	}
	const data = await unitService.reorderUnitPriority(unitIds.map(Number), Number(assignedById));
	res.json({ ok: true, data });
});

export const addDefectToUnit = asyncHandler(async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const { defectType, zone, grade, registeredById, description, photoUrls, isFromWws, overrideExisting, wwsVersion } = req.body || {};
	if (!id || !defectType || !zone || !grade || !registeredById) {
		return res.status(400).json({ ok: false, error: 'Missing id, defectType, zone, grade or registeredById' });
	}
	if (!VALID_GRADES.includes(grade)) {
		return res.status(400).json({ ok: false, error: `Invalid grade. Use ${VALID_GRADES.join('|')}.` });
	}
	const normalizedPhotoUrls = Array.isArray(photoUrls)
		? photoUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
		: undefined;
	const options = {
		isFromWws: !!isFromWws,
		overrideExisting: !!overrideExisting,
		wwsVersion: typeof wwsVersion === 'string' ? wwsVersion : undefined,
	};
	const unit = await unitService.addDefectToUnit(id, defectType, zone, grade, Number(registeredById), description, normalizedPhotoUrls, options);
	res.status(201).json({ ok: true, data: unit });
});

export const deleteDefectPhoto = asyncHandler(async (req: Request, res: Response) => {
	const unitId = Number(req.params.id);
	const defectId = Number(req.params.defectId);

	if (!unitId || !defectId) {
		return res.status(400).json({ ok: false, error: 'Missing unitId or defectId' });
	}

	const unit = await unitService.deleteDefectPhoto(unitId, defectId);
	if (!unit) {
		return res.status(404).json({ ok: false, error: 'Unit not found' });
	}

	res.json({ ok: true, data: unit });
});

export const updateDefectGrade = asyncHandler(async (req: Request, res: Response) => {
	const unitId = Number(req.params.id);
	const defectId = Number(req.params.defectId);
	const { grade, updatedById } = req.body || {};
	if (!unitId || !defectId || !grade || !updatedById) {
		return res.status(400).json({ ok: false, error: 'Missing unitId, defectId, grade or updatedById' });
	}
	if (!VALID_GRADES.includes(grade)) {
		return res.status(400).json({ ok: false, error: `Invalid grade. Use ${VALID_GRADES.join('|')}.` });
	}
	const unit = await unitService.updateDefectGrade(unitId, defectId, grade, Number(updatedById));
	res.json({ ok: true, data: unit });
});

export const getTodayUnits = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const providerId = getCarrierProviderId(user);
	const plant = getUserPlantFilter(user);
	
	const data = await unitService.getTodayUnits(providerId, plant);
	res.json({ ok: true, data });
});

export const setScmDecision = asyncHandler(async (req: Request, res: Response) => {
	const unitId = Number(req.params.id);
	const { decision, note, decidedById } = req.body || {};
	
	if (!unitId || !decision || !decidedById) {
		return res.status(400).json({ ok: false, error: 'Missing unitId, decision or decidedById' });
	}
	
	if (!VALID_SCM_DECISIONS.includes(decision)) {
		return res.status(400).json({ ok: false, error: `Invalid decision. Use ${VALID_SCM_DECISIONS.join('|')}` });
	}
	
	const unit = await unitService.setScmDecision(unitId, decision, note || null, Number(decidedById));
	res.json({ ok: true, data: unit });
});

export const getStatusStats = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const plant = getUserPlantFilter(user);
	const stats = await unitService.getStatusStats(plant);
	res.json({ ok: true, data: stats });
});

export const updateEstimatedRepairTime = asyncHandler(async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const { estimatedRepairHours, updatedById } = req.body || {};
	if (!id || !estimatedRepairHours || !updatedById) {
		return res.status(400).json({ ok: false, error: 'Missing id, estimatedRepairHours or updatedById' });
	}
	const unit = await unitService.updateEstimatedRepairTime(id, Number(estimatedRepairHours), Number(updatedById));
	res.json({ ok: true, data: unit });
});

export const getUnitsInRepair = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const providerId = getCarrierProviderId(user);
	const plant = getUserPlantFilter(user);
	const includeArchived = req.query.includeArchived === 'true';
	const units = await unitService.getUnitsInRepair(providerId, plant, includeArchived);
	res.json({ ok: true, data: units });
});

export const getUnitById = asyncHandler(async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!id) {
		return res.status(400).json({ ok: false, error: 'Missing unit id' });
	}
	const unit = await unitService.getUnitWithDefects(id);
	if (!unit) {
		return res.status(404).json({ ok: false, error: 'Unit not found' });
	}
	res.json({ ok: true, data: unit });
});

export const archiveUnit = asyncHandler(async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const user = res.locals.user;
	const archivedById = Number(user?.userId);
	if (!id || !archivedById) {
		return res.status(400).json({ ok: false, error: 'Missing id or authenticated user' });
	}
	const unit = await unitService.archiveUnit(id, archivedById);
	res.json({ ok: true, data: unit });
});

export const getArchivableUnits = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const plant = getUserPlantFilter(user);
	const data = await unitService.getArchivableUnits(plant);
	res.json({ ok: true, data });
});
