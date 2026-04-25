import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { handleRSVPWithWaitlist, getUserRSVP, getWaitlistPosition } from '@/lib/rsvp-queries';
import { getEventBySlug } from '@/lib/event-queries';
import { Event } from '@/models/Event';
import { RSVP } from '@/models/RSVP';
import type { ApiResponse, RSVPStatus } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const event = await getEventBySlug(params.slug);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Event not found' },
        { status: 404 }
      );
    }

    const { status } = await request.json();

    if (!['going', 'interested', 'declined'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status', error: 'Status must be going, interested, or declined' },
        { status: 400 }
      );
    }

    const eventId = event._id.toString();
    const result = await handleRSVPWithWaitlist(user.id, eventId, status as RSVPStatus);

    // Notify organizer when someone newly RSVPs Going or Interested (fire-and-forget)
    if (status !== 'declined') {
      try {
        const { createNotification } = await import('@/lib/notification-queries');
        const organizerId = event.organizerId.toString();
        if (organizerId !== user.id) {
          const label = result.onWaitlist ? 'joined the waitlist for' : `is ${status === 'going' ? 'going to' : 'interested in'}`;
          await createNotification({
            recipientId: organizerId,
            eventId,
            type: 'rsvp_response',
            title: `New RSVP: ${event.title}`,
            message: `${user.name} ${label} your event.`,
            priority: 'low',
          });
        }
      } catch (notifErr) {
        console.error('RSVP organizer notification failed:', notifErr);
      }
    }

    // Auto clash alert for attendee when RSVP becomes going/interested
    if (result.rsvp.status !== 'declined') {
      try {
        const { createNotification } = await import('@/lib/notification-queries');
        const myGoing = await (RSVP as any).find({
          userId: user.id,
          status: 'going',
          waitlistPosition: { $exists: false },
          eventId: { $ne: eventId },
        })
          .select('eventId')
          .lean()
          .exec() as any[];

        if (myGoing.length > 0) {
          const ids = myGoing.map((r: any) => r.eventId);
          const overlapping = await (Event as any).find({
            _id: { $in: ids },
            startDateTime: { $lt: event.endDateTime },
            endDateTime: { $gt: event.startDateTime },
          })
            .select('title')
            .lean()
            .exec() as any[];

          if (overlapping.length > 0) {
            await createNotification({
              recipientId: user.id,
              eventId,
              type: 'emergency_alert',
              title: '🚨 Schedule clash detected',
              message: `"${event.title}" overlaps with ${overlapping.map((e: any) => `"${e.title}"`).join(', ')}.`,
              priority: 'high',
            });
          }
        }
      } catch (clashErr) {
        console.error('RSVP clash notification failed:', clashErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: result.onWaitlist
        ? `Added to waitlist at position ${result.waitlistPosition}`
        : 'RSVP updated',
      data: {
        status: result.rsvp.status,
        onWaitlist: result.onWaitlist,
        waitlistPosition: result.waitlistPosition ?? null,
        promoted: result.promoted,
      },
    });
  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update RSVP', error: 'Internal server error' },
      { status: 500 }
    );
  }
}


export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const event = await getEventBySlug(params.slug);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Event not found' },
        { status: 404 }
      );
    }

    const eventId = event._id.toString();
    const rsvp = await getUserRSVP(user.id, eventId);
    const waitlistPosition = rsvp ? await getWaitlistPosition(user.id, eventId) : null;

    return NextResponse.json({
      success: true,
      message: 'RSVP fetched',
      data: rsvp
        ? {
            status: rsvp.status,
            onWaitlist: waitlistPosition !== null,
            waitlistPosition,
          }
        : null,
    });
  } catch (error) {
    console.error('RSVP fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch RSVP', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
