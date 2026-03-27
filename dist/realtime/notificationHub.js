"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastNotifications = exports.initNotificationHub = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ws_1 = require("ws");
const environment_1 = require("../config/environment");
let wss = null;
const initNotificationHub = (server) => {
    wss = new ws_1.WebSocketServer({ server, path: '/ws/notifications' });
    wss.on('connection', (socket, req) => {
        const url = new URL(req.url ?? '', 'http://localhost');
        const token = url.searchParams.get('token');
        if (!token) {
            socket.close(1008, 'Missing token');
            return;
        }
        const jwtSecret = environment_1.env.jwtSecret;
        try {
            const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
            socket.userId = payload.userId;
        }
        catch (err) {
            socket.close(1008, 'Invalid token');
            return;
        }
        socket.send(JSON.stringify({ type: 'connected' }));
    });
};
exports.initNotificationHub = initNotificationHub;
const broadcastNotifications = (notifications) => {
    if (!wss || notifications.length === 0)
        return;
    const byUser = new Map();
    for (const notification of notifications) {
        if (!byUser.has(notification.userId)) {
            byUser.set(notification.userId, []);
        }
        byUser.get(notification.userId).push(notification);
    }
    wss.clients.forEach(client => {
        const socket = client;
        if (socket.readyState !== ws_1.WebSocket.OPEN || !socket.userId)
            return;
        const payload = byUser.get(socket.userId);
        if (!payload || payload.length === 0)
            return;
        socket.send(JSON.stringify({
            type: 'notification',
            payload,
        }));
    });
};
exports.broadcastNotifications = broadcastNotifications;
//# sourceMappingURL=notificationHub.js.map