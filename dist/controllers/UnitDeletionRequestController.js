"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideUnitDeletionRequest = exports.listUnitDeletionRequests = exports.requestUnitDeletion = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
exports.requestUnitDeletion = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const unitId = Number(req.params.id);
    const user = res.locals.user;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!unitId || !reason) {
        return res.status(400).json({ ok: false, error: 'Missing unitId or reason' });
    }
    const data = await services_1.unitDeletionRequestService.requestDeletion(unitId, Number(user.userId), reason);
    res.status(201).json({ ok: true, data });
});
exports.listUnitDeletionRequests = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : 'PENDING';
    const plant = (0, helpers_1.getUserPlantFilter)(res.locals.user);
    const data = await services_1.unitDeletionRequestService.listRequests(status, plant);
    res.json({ ok: true, data });
});
exports.decideUnitDeletionRequest = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
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
    const data = await services_1.unitDeletionRequestService.decideRequest(requestId, decision, decisionNote, Number(user.userId));
    res.json({ ok: true, data });
});
//# sourceMappingURL=UnitDeletionRequestController.js.map