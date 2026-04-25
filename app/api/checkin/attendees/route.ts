import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { RSVP } from '@/models/RSVP';
import { Event } from '@/models/Event';
import { CheckIn } from '@/models/CheckIn';
import { User } from '@/models/User';
import type { ApiResponse } from '@/types';

// GET /api/checkin/attendees?eventId=xxx
// Returns all confirmed "going" (non-waitlisted) attendees for an event, with check-in status
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const organizer = getCurrentUserFromRequest(request);
  if (!organizer) return unauthorizedResponse();
  if (organizer.role !== 'organizer' && organizer.role !== 'admin') return forbiddenResponse('Organizer access required');

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  if (!eventId) {
    return NextResponse.json({ success: false, message: 'eventId is required', error: 'Missing param' }, { status: 400 });
  }

  try {
    await connectDB();

    // @ts-ignore
    const event = await Event.findById(eventId).lean().exec() as any;
    if (!event) {
      return NextResponse.json({ success: false, message: 'Event not found', error: 'Not found' }, { status: 404 });
    }

    // Ownership check
    if (organizer.role !== 'admin' && event.organizerId.toString() !== organizer.id) {
      return forbiddenResponse('You do not own this event');
    }

    // All confirmed going (no waitlist)
    // @ts-ignore
    const rsvps = await RSVP.find({ eventId, status: 'going', waitlistPosition: { $exists: false } })
      .lean()
      .exec() as any[];

    const userIds = rsvps.map((r) => r.userId);

    // Fetch user details
    // @ts-ignore
    const users = await User.find({ _id: { $in: userIds } }).select('name email avatarUrl').lean().exec() as any[];
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    // Fetch already-checked-in user IDs
    // @ts-ignore
    const checkIns = await CheckIn.find({ eventId, userId: { $in: userIds } }).lean().exec() as any[];
    const checkedInSet = new Set(checkIns.map((c) => c.userId.toString()));

    const attendees = rsvps.map((r) => {
      const u = userMap.get(r.userId.toString());
      return {
        userId: r.userId.toString(),
        name: u?.name ?? 'Unknown',
        email: u?.email ?? '',
        avatarUrl: u?.avatarUrl ?? null,
        checkedIn: checkedInSet.has(r.userId.toString()),
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Attendees fetched',
      data: { attendees, total: attendees.length },
    });
  } catch (error) {
    console.error('Attendees fetch error:', error);
    return NextResponse.json({ success: false, message: 'Server error', error: 'Internal server error' }, { status: 500 });
  }
}
