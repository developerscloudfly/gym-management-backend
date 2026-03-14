import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'payment'
  | 'subscription'
  | 'class'
  | 'attendance'
  | 'workout'
  | 'diet'
  | 'general';

export interface INotification extends Document {
  userId: Types.ObjectId;
  gymId?: Types.ObjectId;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  isActive: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['payment', 'subscription', 'class', 'attendance', 'workout', 'diet', 'general'],
      default: 'general',
    },
    isRead: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
