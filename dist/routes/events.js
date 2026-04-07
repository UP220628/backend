"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const unitEventStream_1 = require("../realtime/unitEventStream");
const environment_1 = require("../config/environment");
const constants_1 = require("../constants");
const router = (0, express_1.Router)();
router.get('/units', (req, res) => {
    let userPlant;
    const authUser = res.locals?.user;
    if (authUser) {
        userPlant = authUser.roleId === constants_1.ROLE_IDS.ADMIN ? undefined : authUser.plant;
    }
    else {
        const token = typeof req.query.token === 'string' ? req.query.token : undefined;
        if (!token) {
            return res.status(401).json({ ok: false, error: 'Missing authentication token' });
        }
        try {
            const payload = jsonwebtoken_1.default.verify(token, environment_1.env.jwtSecret);
            const roleId = Number(payload.roleId);
            userPlant = roleId === constants_1.ROLE_IDS.ADMIN ? undefined : payload.plant;
        }
        catch (err) {
            return res.status(401).json({ ok: false, error: 'Invalid token' });
        }
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write('event: connected\ndata: {"ok": true}\n\n');
    (0, unitEventStream_1.addUnitEventClient)(res, userPlant);
    const keepAlive = setInterval(() => {
        res.write(':keep-alive\n\n');
    }, constants_1.SSE_KEEPALIVE_MS);
    req.on('close', () => {
        clearInterval(keepAlive);
        (0, unitEventStream_1.removeUnitEventClient)(res);
    });
});
exports.default = router;
//# sourceMappingURL=events.js.map