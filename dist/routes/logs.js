"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const StatusHistoryController_1 = require("../controllers/StatusHistoryController");
const router = (0, express_1.Router)();
router.get('/', StatusHistoryController_1.getLogs);
router.get('/export', StatusHistoryController_1.exportLogsToExcel);
exports.default = router;
//# sourceMappingURL=logs.js.map