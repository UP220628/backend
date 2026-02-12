import { Router } from 'express';
import { deleteNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/NotificationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, listNotifications);
router.put('/:id/read', requireAuth, markNotificationRead);
router.post('/read-all', requireAuth, markAllNotificationsRead);
router.delete('/:id', requireAuth, deleteNotification);

export default router;
