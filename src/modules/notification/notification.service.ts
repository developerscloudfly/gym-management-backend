import { Types } from 'mongoose';
import { Notification, NotificationType } from './notification.model';
import { ApiError } from '../../utils/apiError';
import { PaginationOptions, buildPaginationMeta } from '../../utils/pagination';

interface CreateNotificationInput {
  userId: Types.ObjectId;
  gymId?: Types.ObjectId;
  title: string;
  body: string;
  type?: NotificationType;
}

export const createNotification = async (data: CreateNotificationInput) => {
  return Notification.create({
    userId: data.userId,
    gymId: data.gymId,
    title: data.title,
    body: data.body,
    type: data.type ?? 'general',
  });
};

export const getMyNotifications = async (
  userId: string,
  opts: PaginationOptions,
  onlyUnread: boolean
) => {
  const query: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    isActive: true,
  };
  if (onlyUnread) query.isRead = false;

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(opts.skip)
      .limit(opts.limit),
    Notification.countDocuments(query),
  ]);

  return { notifications, meta: buildPaginationMeta(total, opts) };
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await Notification.findOne({
    _id: new Types.ObjectId(notificationId),
    userId: new Types.ObjectId(userId),
    isActive: true,
  });

  if (!notification) throw ApiError.notFound('Notification not found');

  notification.isRead = true;
  await notification.save();
  return notification;
};

export const markAllAsRead = async (userId: string) => {
  await Notification.updateMany(
    { userId: new Types.ObjectId(userId), isRead: false, isActive: true },
    { isRead: true }
  );
};

export const deleteNotification = async (userId: string, notificationId: string) => {
  const notification = await Notification.findOne({
    _id: new Types.ObjectId(notificationId),
    userId: new Types.ObjectId(userId),
  });

  if (!notification) throw ApiError.notFound('Notification not found');

  notification.isActive = false;
  await notification.save();
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  return Notification.countDocuments({
    userId: new Types.ObjectId(userId),
    isRead: false,
    isActive: true,
  });
};
