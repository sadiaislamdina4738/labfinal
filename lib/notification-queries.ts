import { Notification } from '@/models/Notification';
import type { INotification, NotificationType, NotificationPriority } from '@/types';

/**
 * Create a notification
 */
export async function createNotification(data: {
  recipientId: string;
  eventId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
}): Promise<INotification> {
  // @ts-ignore
  return await Notification.create(data);
}

/**
 * Get user notifications
 */
export async function getUserNotifications(userId: string, options: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  // @ts-ignore
  const notifications = await Notification.find({ recipientId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();

  // @ts-ignore
  const total = await Notification.countDocuments({ recipientId: userId });

  return { notifications, total };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  // @ts-ignore
  await Notification.findByIdAndUpdate(notificationId, { read: true }).exec();
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  // @ts-ignore
  await Notification.updateMany({ recipientId: userId }, { read: true }).exec();
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  // @ts-ignore
  return await Notification.countDocuments({ recipientId: userId, read: false });
}

/**
 * Notify all event attendees
 */
export async function notifyEventAttendees(
  eventId: string,
  type: NotificationType,
  title: string,
  message: string,
  priority: NotificationPriority,
  userIdsToExclude: string[] = []
): Promise<void> {
  const { RSVP } = await import('@/models/RSVP');

  // @ts-ignore
  const attendees = await RSVP.find({
    eventId,
    status: { $in: ['going', 'interested'] },
    userId: { $nin: userIdsToExclude },
  }).exec();

  const notifications = attendees.map((rsvp: any) => ({
    recipientId: rsvp.userId,
    eventId,
    type,
    title,
    message,
    priority,
  }));

  if (notifications.length > 0) {
    // @ts-ignore
    await Notification.insertMany(notifications);
  }
}
