import { Request, Response } from 'express';
import { unitService } from '../services/UnitService';

export const listUnits = async (req: Request, res: Response) => {
	try {
		const user = res.locals.user;
		const limit = req.query.limit ? Number(req.query.limit) : undefined;
		const status = typeof req.query.status === 'string' ? req.query.status : undefined;
		const providerId = user?.roleId === 4 && user.providerId ? user.providerId : undefined; // CARRIER filtra por su proveedor
		
		// Plant filtering: ADMIN (roleId=5) sees all plants, others see only their plant
		const plant = user?.roleId === 5 ? undefined : user?.plant;
		
		const data = status 
			? await unitService.listUnitsByStatus(status, limit, providerId, plant) 
			: await unitService.listUnits(limit, providerId, plant);
		res.json({ ok: true, data });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const getDefectStats = async (req: Request, res: Response) => {
	try {
		const user = res.locals.user;
		const filterToday = req.query.filter === 'today';
		const plant = user?.roleId === 5 ? undefined : user?.plant;
		const stats = await unitService.getDefectStats(filterToday, plant);
		res.json({ ok: true, data: stats });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const createUnit = async (req: Request, res: Response) => {
	try {
		const user = res.locals.user;
		const { vin, market, lane, registeredById, providerId, plant } = req.body || {};
		if (!vin || !market || !lane || !registeredById) {
			return res.status(400).json({ ok: false, error: 'Missing required fields' });
		}
		
		// Determinar el providerId:
		// 1. Si viene providerId en el body (WWS reportando), usar ese
		// 2. Si el usuario es CARRIER (roleId=4) y tiene providerId, usar el del usuario
		// 3. Si no, dejar null
		let finalProviderId = providerId;
		if (!finalProviderId && user?.roleId === 4 && user.providerId) {
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
		if (user?.roleId !== 5 && user?.plant && plant && plant !== user.plant) {
			return res.status(403).json({ ok: false, error: 'Cannot create units in a different plant' });
		}
		
		const unit = await unitService.createUnit({ vin, market, lane, registeredById, providerId: finalProviderId, plant: finalPlant }, user?.roleId);
		res.status(201).json({ ok: true, data: unit });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const updateUnitStatus = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		const { newStatus, changedById, estimatedRepairHours, isAvailableToday, note, vqaComment } = req.body || {};
		if (!id || !newStatus || !changedById) {
			return res.status(400).json({ ok: false, error: 'Missing id, newStatus or changedById' });
		}
		const unit = await unitService.updateUnitStatus(id, newStatus, Number(changedById), estimatedRepairHours, isAvailableToday, note, vqaComment);
		res.json({ ok: true, data: unit });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const updateUnitPriority = async (req: Request, res: Response) => {
	try {
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
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const updatePriorityOrder = async (req: Request, res: Response) => {
	try {
		const { unitIds, assignedById } = req.body || {};
		if (!Array.isArray(unitIds) || unitIds.length === 0 || !assignedById) {
			return res.status(400).json({ ok: false, error: 'Missing unitIds or assignedById' });
		}
		const data = await unitService.reorderUnitPriority(unitIds.map(Number), Number(assignedById));
		res.json({ ok: true, data });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const addDefectToUnit = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		const { defectType, zone, grade, registeredById, description, isFromWws, overrideExisting, wwsVersion, photoUrls } = req.body || {};
		if (!id || !defectType || !zone || !grade || !registeredById) {
			return res.status(400).json({ ok: false, error: 'Missing id, defectType, zone, grade or registeredById' });
		}
		if (!['V1','V2','V3'].includes(grade)) {
			return res.status(400).json({ ok: false, error: 'Invalid grade. Use V1|V2|V3.' });
		}
		const options = {
			isFromWws: !!isFromWws,
			overrideExisting: !!overrideExisting,
			wwsVersion: typeof wwsVersion === 'string' ? wwsVersion : undefined,
			photoUrls: Array.isArray(photoUrls) ? photoUrls as string[] : undefined,
		};
		const unit = await unitService.addDefectToUnit(id, defectType, zone, grade, Number(registeredById), description, options);
		res.status(201).json({ ok: true, data: unit });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const updateDefectGrade = async (req: Request, res: Response) => {
	try {
		const unitId = Number(req.params.id);
		const defectId = Number(req.params.defectId);
		const { grade, updatedById } = req.body || {};
		if (!unitId || !defectId || !grade || !updatedById) {
			return res.status(400).json({ ok: false, error: 'Missing unitId, defectId, grade or updatedById' });
		}
		if (!['V1','V2','V3'].includes(grade)) {
			return res.status(400).json({ ok: false, error: 'Invalid grade. Use V1|V2|V3.' });
		}
		const unit = await unitService.updateDefectGrade(unitId, defectId, grade, Number(updatedById));
		res.json({ ok: true, data: unit });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const getTodayUnits = async (req: Request, res: Response) => {
	try {
		const user = res.locals.user;
		const providerId = user?.roleId === 4 && user.providerId ? user.providerId : undefined;
		const plant = user?.roleId === 5 ? undefined : user?.plant;
		
		const data = await unitService.getTodayUnits(providerId, plant);
		res.json({ ok: true, data });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const setScmDecision = async (req: Request, res: Response) => {
	try {
		const unitId = Number(req.params.id);
		const { decision, note, decidedById } = req.body || {};
		
		if (!unitId || !decision || !decidedById) {
			return res.status(400).json({ ok: false, error: 'Missing unitId, decision or decidedById' });
		}
		
		const validDecisions = ['LOAD_WITHOUT', 'WAIT', 'REORGANIZE', 'NEW_TRIP'];
		if (!validDecisions.includes(decision)) {
			return res.status(400).json({ ok: false, error: 'Invalid decision. Use LOAD_WITHOUT|WAIT|REORGANIZE|NEW_TRIP' });
		}
		
		const unit = await unitService.setScmDecision(unitId, decision, note || null, Number(decidedById));
		res.json({ ok: true, data: unit });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const getStatusStats = async (req: Request, res: Response) => {
	try {
		const user = res.locals.user;
		const plant = user?.roleId === 5 ? undefined : user?.plant;
		const stats = await unitService.getStatusStats(plant);
		res.json({ ok: true, data: stats });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const updateEstimatedRepairTime = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		const { estimatedRepairHours, updatedById } = req.body || {};
		if (!id || !estimatedRepairHours || !updatedById) {
			return res.status(400).json({ ok: false, error: 'Missing id, estimatedRepairHours or updatedById' });
		}
		const unit = await unitService.updateEstimatedRepairTime(id, Number(estimatedRepairHours), Number(updatedById));
		res.json({ ok: true, data: unit });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const getUnitsInRepair = async (req: Request, res: Response) => {
	try {
		const user = res.locals.user;
		// CARRIER solo puede ver sus propias unidades, otros roles ven todas
		const providerId = user?.roleId === 4 && user.providerId ? user.providerId : undefined;
		const plant = user?.roleId === 5 ? undefined : user?.plant;
		const units = await unitService.getUnitsInRepair(providerId, plant);
		res.json({ ok: true, data: units });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const getUnitById = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		if (!id) {
			return res.status(400).json({ ok: false, error: 'Missing unit id' });
		}
		const unit = await unitService.getUnitWithDefects(id);
		if (!unit) {
			return res.status(404).json({ ok: false, error: 'Unit not found' });
		}
		res.json({ ok: true, data: unit });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};
