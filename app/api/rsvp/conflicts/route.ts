import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { RSVP } from '@/models/RSVP';
import { Event } from '@/models/Event';
import { Notification } from '@/models/Notification';
import { createNotification } from '@/lib/notification-queries';
import type { ApiResponse } from '@/types';

/**
 * GET /api/rsvp/conflicts?eventId=<id>
 * Returns any events the current user is confirmed-going to that overlap
 * in time with the specified event.
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'eventId is required', error: 'Missing eventId' },
        { status: 400 }
      );
    }

    // Get the event we're checking against
    // @ts-ignore
    const targetEvent = await Event.findById(eventId).lean().exec() as any;
    if (!targetEvent) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Event not found' },
        { status: 404 }
      );
    }

    // Find all confirmed "going" RSVPs for this user (excluding this event)
    // @ts-ignore
    const userRSVPs = await RSVP.find({
      userId: user.id,
      status: 'going',
      waitlistPosition: { $exists: false },
      eventId: { $ne: eventId },
    }).exec();

    if (userRSVPs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No conflicts',
        data: { conflicts: [] },
      });
    }

    const userEventIds = userRSVPs.map((r: any) => r.eventId);

    // Find overlapping events: they overlap if start < targetEnd AND end > targetStart
    // @ts-ignore
    const conflictingEvents = await Event.find({
      _id: { $in: userEventIds },
      startDateTime: { $lt: targetEvent.endDateTime },
      endDateTime: { $gt: targetEvent.startDateTime },
    })
      .select('title slug startDateTime endDateTime venueName')
      .lean()
      .exec() as any[];

    const conflicts = conflictingEvents.map((e: any) => ({
      id: e._id.toString(),
      title: e.title,
      slug: e.slug,
      startDateTime: e.startDateTime,
      endDateTime: e.endDateTime,
      venueName: e.venueName,
    }));

    if (conflicts.length > 0) {
      // Avoid spamming: only create one conflict notification per event per ~6h
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
      // @ts-ignore
      const existing = await Notification.findOne({
        recipientId: user.id,
        eventId: targetEvent._id,
        type: 'emergency_alert',
        createdAt: { $gte: since },
      })
        .select('_id')
        .lean()
        .exec();

      if (!existing) {
        const targetStart = new Date(targetEvent.startDateTime);
        const targetEnd = new Date(targetEvent.endDateTime);
        await createNotification({
          recipientId: user.id,
          eventId: targetEvent._id.toString(),
          type: 'emergency_alert',
          title: '🚨 Schedule clash detected',
          message:
            `"${targetEvent.title}" (${targetStart.toLocaleString()}–${targetEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) overlaps with ` +
            conflicts.map((c) => `"${c.title}"`).join(', ') +
            '. Consider changing your RSVP or checking times.',
          priority: 'high',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: conflicts.length > 0 ? 'Conflicts found' : 'No conflicts',
      data: { conflicts },
    });
  } catch (error) {
    console.error('RSVP conflicts error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check conflicts', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
