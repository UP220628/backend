"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.get('/db', async (_req, res) => {
    try {
        const pool = await (0, database_1.getPool)();
        const result = await pool.query('SELECT 1 AS ok');
        res.json({ ok: true, db: result.rows[0].ok === 1 });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map