"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DashboardController_1 = require("../controllers/DashboardController");
const router = (0, express_1.Router)();
router.get('/weekly-by-provider', DashboardController_1.getWeeklyUnitsByProvider);
router.get('/monthly-timeline', DashboardController_1.getMonthlyUnitsTimeline);
router.get('/defects-by-model', DashboardController_1.getDefectsByModel);
router.get('/defects-by-type', DashboardController_1.getDefectsByType);
exports.default = router;
//# sourceMappingURL=dashboard.js.map