import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { p } from '../../utils/param';
import * as notificationService from './notification.service';

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const opts = getPaginationOptions(req);
  const onlyUnread = req.query.unread === 'true';
  const { notifications, meta } = await notificationService.getMyNotifications(userId, opts, onlyUnread);
  sendResponse({ res, statusCode: 200, message: 'Notifications retrieved', data: notifications, meta });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const notificationId = p(req.params.notificationId);
  const notification = await notificationService.markAsRead(userId, notificationId);
  sendResponse({ res, statusCode: 200, message: 'Marked as read', data: notification });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  await notificationService.markAllAsRead(userId);
  sendResponse({ res, statusCode: 200, message: 'All notifications marked as read', data: null });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const notificationId = p(req.params.notificationId);
  await notificationService.deleteNotification(userId, notificationId);
  sendResponse({ res, statusCode: 200, message: 'Notification deleted', data: null });
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const count = await notificationService.getUnreadCount(userId);
  sendResponse({ res, statusCode: 200, message: 'Unread count retrieved', data: { count } });
});
