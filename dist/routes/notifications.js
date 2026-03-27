"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const NotificationController_1 = require("../controllers/NotificationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, NotificationController_1.listNotifications);
router.put('/:id/read', auth_1.requireAuth, NotificationController_1.markNotificationRead);
router.post('/read-all', auth_1.requireAuth, NotificationController_1.markAllNotificationsRead);
router.delete('/:id', auth_1.requireAuth, NotificationController_1.deleteNotification);
exports.default = router;
//# sourceMappingURL=notifications.js.map