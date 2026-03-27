"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllNotificationsRead = exports.markNotificationRead = exports.listNotifications = void 0;
const NotificationRepository_1 = require("../repositories/NotificationRepository");
const listNotifications = async (req, res) => {
    try {
        const user = res.locals.user;
        if (!user?.userId) {
            return res.status(401).json({ ok: false, error: 'Authentication required' });
        }
        const isReadParam = req.query.isRead;
        const isRead = typeof isReadParam === 'string' ? isReadParam === 'true' : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const data = await NotificationRepository_1.notificationRepository.listByUser(user.userId, isRead, limit, offset);
        return res.json({ ok: true, data });
    }
    catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
};
exports.listNotifications = listNotifications;
const markNotificationRead = async (req, res) => {
    try {
        const user = res.locals.user;
        const notificationId = Number(req.params.id);
        if (!user?.userId || !notificationId) {
            return res.status(400).json({ ok: false, error: 'Missing notification id' });
        }
        await NotificationRepository_1.notificationRepository.markRead(user.userId, notificationId);
        return res.json({ ok: true });
    }
    catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (req, res) => {
    try {
        const user = res.locals.user;
        if (!user?.userId) {
            return res.status(401).json({ ok: false, error: 'Authentication required' });
        }
        await NotificationRepository_1.notificationRepository.markAllRead(user.userId);
        return res.json({ ok: true });
    }
    catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
const deleteNotification = async (req, res) => {
    try {
        const user = res.locals.user;
        const notificationId = Number(req.params.id);
        if (!user?.userId || !notificationId) {
            return res.status(400).json({ ok: false, error: 'Missing notification id' });
        }
        await NotificationRepository_1.notificationRepository.deleteById(user.userId, notificationId);
        return res.json({ ok: true });
    }
    catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
};
exports.deleteNotification = deleteNotification;
//# sourceMappingURL=NotificationController.js.map