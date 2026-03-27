import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { unitDeletionRequestService } from '../services';
import { getUserPlantFilter } from '../utils/helpers';

export const requestUnitDeletion = asyncHandler(async (req: Request, res: Response) => {
	const unitId = Number(req.params.id);
	const user = res.locals.user;
	const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

	if (!unitId || !reason) {
		return res.status(400).json({ ok: false, error: 'Missing unitId or reason' });
	}

	const data = await unitDeletionRequestService.requestDeletion(unitId, Number(user.userId), reason);
	res.status(201).json({ ok: true, data });
});

export const listUnitDeletionRequests = asyncHandler(async (req: Request, res: Response) => {
	const status = typeof req.query.status === 'string' ? req.query.status : 'PENDING';
	const plant = getUserPlantFilter(res.locals.user);
	const data = await unitDeletionRequestService.listRequests(status, plant);
	res.json({ ok: true, data });
});

export const decideUnitDeletionRequest = asyncHandler(async (req: Request, res: Response) => {
	const requestId = Number(req.params.requestId);
	const user = res.locals.user;
	const decision = typeof req.body?.decision === 'string' ? req.body.decision.toUpperCase() : '';
	const decisionNote = typeof req.body?.decisionNote === 'string' ? req.body.decisionNote.trim() : null;

	if (!requestId || !decision) {
		return res.status(400).json({ ok: false, error: 'Missing requestId or decision' });
	}

	if (decision !== 'APPROVE' && decision !== 'REJECT') {
		return res.status(400).json({ ok: false, error: 'Invalid decision. Use APPROVE or REJECT.' });
	}

	const data = await unitDeletionRequestService.decideRequest(
		requestId,
		decision,
		decisionNote,
		Number(user.userId)
	);

	res.json({ ok: true, data });
});
