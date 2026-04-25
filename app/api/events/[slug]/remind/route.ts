import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getEventBySlug } from '@/lib/event-queries';
import { createNotification } from '@/lib/notification-queries';
import { EventReminderPreference } from '@/models/EventReminderPreference';
import type { ApiResponse } from '@/types';

// POST /api/events/[slug]/remind — save a reminder notification for this event
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  const user = getCurrentUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectDB();
    const event = await getEventBySlug(params.slug);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const eventStart = new Date(event.startDateTime);
    if (eventStart <= now) {
      return NextResponse.json(
        { success: false, message: 'Cannot set reminder for a past event', error: 'Past event' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reminderMinutes = Number(body?.reminderMinutes || 0);
    const hasReminderLead = Number.isFinite(reminderMinutes) && reminderMinutes > 0;
    const reminderLeadText = hasReminderLead
      ? `${Math.floor(reminderMinutes)} minute${Math.floor(reminderMinutes) === 1 ? '' : 's'} before`
      : 'before the event';

    // Save/overwrite reminder preference for this user + event.
    // Notification delivery is generated automatically from this preference.
    // @ts-ignore
    await EventReminderPreference.findOneAndUpdate(
      { userId: user.id, eventId: event._id.toString() },
      { reminderMinutes, sentAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();

    // Immediate confirmation notification
    await createNotification({
      recipientId: user.id,
      eventId: event._id.toString(),
      type: 'event_reminder',
      title: `🔔 Reminder set: ${event.title}`,
      message: `You will be notified ${reminderLeadText}. "${event.title}" starts on ${eventStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`,
      priority: 'high',
    });

    return NextResponse.json({
      success: true,
      message: 'Reminder saved! You will see it in your notifications.',
      data: null,
    });
  } catch (error) {
    console.error('Remind route error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
