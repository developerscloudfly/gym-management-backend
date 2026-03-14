import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as notificationController from './notification.controller';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:notificationId/read', notificationController.markAsRead);
router.delete('/:notificationId', notificationController.deleteNotification);

export default router;
