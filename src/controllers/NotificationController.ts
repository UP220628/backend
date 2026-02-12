import { Request, Response } from 'express';
import { notificationRepository } from '../repositories/NotificationRepository';

export const listNotifications = async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    if (!user?.userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const isReadParam = req.query.isRead;
    const isRead = typeof isReadParam === 'string' ? isReadParam === 'true' : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const data = await notificationRepository.listByUser(user.userId, isRead, limit, offset);
    return res.json({ ok: true, data });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const notificationId = Number(req.params.id);
    if (!user?.userId || !notificationId) {
      return res.status(400).json({ ok: false, error: 'Missing notification id' });
    }

    await notificationRepository.markRead(user.userId, notificationId);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    if (!user?.userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    await notificationRepository.markAllRead(user.userId);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const notificationId = Number(req.params.id);
    if (!user?.userId || !notificationId) {
      return res.status(400).json({ ok: false, error: 'Missing notification id' });
    }

    await notificationRepository.deleteById(user.userId, notificationId);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
