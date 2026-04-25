import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { createNotification, getUserNotifications, getUnreadCount, markAllNotificationsAsRead } from '@/lib/notification-queries';
import { Event } from '@/models/Event';
import { Notification } from '@/models/Notification';
import { EventReminderPreference } from '@/models/EventReminderPreference';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Auto-create reminders based on selected lead time per event.
    // This runs when notifications are fetched to avoid a separate cron dependency.
    const now = new Date();
    // @ts-ignore
    const reminderPrefs = await EventReminderPreference.find({
      userId: user.id,
      sentAt: null,
    })
      .select('eventId reminderMinutes')
      .lean()
      .exec() as any[];

    const reminderEventIds = Array.from(new Set(reminderPrefs.map((r: any) => r.eventId?.toString()).filter(Boolean)));
    if (reminderEventIds.length > 0) {
      // @ts-ignore
      const events = await Event.find({
        _id: { $in: reminderEventIds },
      })
        .select('title startDateTime')
        .lean()
        .exec() as any[];

      const eventMap = new Map(events.map((ev: any) => [ev._id.toString(), ev]));

      for (const pref of reminderPrefs) {
        const eventId = pref.eventId?.toString?.() ?? String(pref.eventId);
        const ev = eventMap.get(eventId);
        if (!ev) continue;

        const start = new Date(ev.startDateTime);
        if (Number.isNaN(start.getTime())) continue;

        const minutes = Number(pref.reminderMinutes ?? 0);
        if (!Number.isFinite(minutes) || minutes <= 0) continue;

        const triggerAt = new Date(start.getTime() - minutes * 60 * 1000);
        // Trigger when the selected reminder time is reached (or slightly late).
        if (now >= triggerAt && now < start) {
          await createNotification({
            recipientId: user.id,
            eventId,
            type: 'event_reminder',
            title: `⏰ Reminder: ${ev.title}`,
            message: `"${ev.title}" starts in ${minutes} minute${minutes === 1 ? '' : 's'} (${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}).`,
            priority: 'high',
          });

          // Mark delivered so we don't duplicate on every fetch
          // @ts-ignore
          await EventReminderPreference.findByIdAndUpdate(pref._id, { sentAt: now }).exec();
        } else if (now >= start) {
          // Event already started; prevent stale reminder deliveries.
          // @ts-ignore
          await EventReminderPreference.findByIdAndUpdate(pref._id, { sentAt: now }).exec();
        }
      }
    }

    const { notifications, total } = await getUserNotifications(user.id, {
      page,
      limit: 20,
    });

    const unreadCount = await getUnreadCount(user.id);

    // Collect eventIds to batch-fetch slugs
    const eventIds = notifications
      .map((n: any) => n.eventId?.toString())
      .filter(Boolean);

    const eventSlugMap: Record<string, string> = {};
    if (eventIds.length > 0) {
      // @ts-ignore
      const events = await Event.find({ _id: { $in: eventIds } })
        .select('slug')
        .lean()
        .exec() as any[];
      events.forEach((e: any) => {
        eventSlugMap[e._id.toString()] = e.slug;
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications fetched',
      data: {
        notifications: notifications.map((n: any) => ({
          id: n._id,
          type: n.type,
          title: n.title,
          message: n.message,
          priority: n.priority,
          read: n.read,
          eventId: n.eventId?.toString() ?? null,
          eventSlug: n.eventId ? (eventSlugMap[n.eventId.toString()] ?? null) : null,
          createdAt: n.createdAt,
        })),
        unreadCount,
        pagination: {
          page,
          limit: 20,
          total,
          pages: Math.ceil(total / 20),
        },
      },
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notifications', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const { action } = await request.json();

    if (action === 'mark_all_read') {
      await markAllNotificationsAsRead(user.id);
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action', error: 'Action not recognized' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update notifications', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
