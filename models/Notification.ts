import mongoose, { Schema, Document, Types } from 'mongoose';
import type { NotificationType, NotificationPriority } from '@/types';

export interface NotificationDocument extends Document {
  recipientId: Types.ObjectId;
  eventId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    } as any,
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    } as any,
    type: {
      type: String,
      enum: ['event_reminder', 'event_update', 'rsvp_response', 'new_review', 'photo_approved', 'announcement', 'check_in_opened', 'emergency_alert'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Index for user notifications
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, read: 1 });

export const Notification = mongoose.models.Notification || mongoose.model<NotificationDocument>('Notification', notificationSchema);
