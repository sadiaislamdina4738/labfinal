import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { CheckIn } from '@/models/CheckIn';
import { RSVP } from '@/models/RSVP';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import type { ApiResponse } from '@/types';

// POST /api/checkin/manual — organizer manually checks in an attendee by userId
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const organizer = getCurrentUserFromRequest(request);
  if (!organizer) return unauthorizedResponse();
  if (organizer.role !== 'organizer' && organizer.role !== 'admin') return forbiddenResponse('Organizer access required');

  try {
    await connectDB();
    const body = await request.json();
    const { userId, eventId } = body as { userId?: string; eventId?: string };

    if (!userId || !eventId) {
      return NextResponse.json(
        { success: false, message: 'userId and eventId are required', error: 'Missing fields' },
        { status: 400 }
      );
    }

    // @ts-ignore
    const event = await Event.findById(eventId).lean().exec() as any;
    if (!event) {
      return NextResponse.json({ success: false, message: 'Event not found', error: 'Not found' }, { status: 404 });
    }

    // Ownership check
    if (organizer.role !== 'admin' && event.organizerId.toString() !== organizer.id) {
      return forbiddenResponse('You do not own this event');
    }

    // Check the attendee is RSVP'd as going (not waitlisted)
    // @ts-ignore
    const rsvp = await RSVP.findOne({ userId, eventId, status: 'going' }).lean().exec() as any;
    if (!rsvp) {
      return NextResponse.json(
        { success: false, message: "Attendee is not RSVP'd as going", error: 'Not going' },
        { status: 400 }
      );
    }
    if (rsvp.waitlistPosition != null) {
      return NextResponse.json(
        { success: false, message: 'Attendee is on the waitlist and not confirmed', error: 'On waitlist' },
        { status: 400 }
      );
    }

    // Record check-in
    try {
      // @ts-ignore
      await CheckIn.create({ userId, eventId, checkedInBy: organizer.id, source: 'manual' });
    } catch (err: any) {
      if (err.code === 11000) {
        return NextResponse.json(
          { success: false, message: 'Attendee is already checked in', error: 'Duplicate' },
          { status: 409 }
        );
      }
      throw err;
    }

    // @ts-ignore
    const attendee = await User.findById(userId).select('name avatarUrl').lean().exec() as any;

    return NextResponse.json({
      success: true,
      message: `${attendee?.name ?? 'Attendee'} checked in successfully!`,
      data: {
        userId,
        userName: attendee?.name ?? 'Unknown',
        avatarUrl: attendee?.avatarUrl ?? null,
        checkedInAt: new Date(),
        source: 'manual',
      },
    });
  } catch (error) {
    console.error('Manual check-in error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
