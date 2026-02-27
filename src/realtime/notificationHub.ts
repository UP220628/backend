import type { IncomingMessage, Server } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { env } from '../config/environment';

type AuthedSocket = WebSocket & { userId?: number };

type NotificationPayload = {
  id: number;
  userId: number;
  unitId: number;
  type: string;
  message: string | null;
  isRead: boolean;
  createdAt: Date;
};

let wss: WebSocketServer | null = null;

export const initNotificationHub = (server: Server) => {
  wss = new WebSocketServer({ server, path: '/ws/notifications' });

  wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(1008, 'Missing token');
      return;
    }

    const jwtSecret = env.jwtSecret;

    try {
      const payload = jwt.verify(token, jwtSecret) as any;
      (socket as AuthedSocket).userId = payload.userId;
    } catch (err: any) {
      socket.close(1008, 'Invalid token');
      return;
    }

    socket.send(JSON.stringify({ type: 'connected' }));
  });
};

export const broadcastNotifications = (notifications: NotificationPayload[]) => {
  if (!wss || notifications.length === 0) return;

  const byUser = new Map<number, NotificationPayload[]>();
  for (const notification of notifications) {
    if (!byUser.has(notification.userId)) {
      byUser.set(notification.userId, []);
    }
    byUser.get(notification.userId)!.push(notification);
  }

  wss.clients.forEach(client => {
    const socket = client as AuthedSocket;
    if (socket.readyState !== WebSocket.OPEN || !socket.userId) return;

    const payload = byUser.get(socket.userId);
    if (!payload || payload.length === 0) return;

    socket.send(
      JSON.stringify({
        type: 'notification',
        payload,
      })
    );
  });
};
