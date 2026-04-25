import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { Event } from '@/models/Event';
import { CheckIn } from '@/models/CheckIn';
import { RSVP } from '@/models/RSVP';
import { User } from '@/models/User';
import type { ApiResponse } from '@/types';

// GET /api/checkin?eventId=xxx — organizer fetches live stats + recent check-ins
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const user = getCurrentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== 'organizer' && user.role !== 'admin') return forbiddenResponse('Organizer access required');

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

    // Ensure organizer owns this event (or is admin)
    if (user.role !== 'admin' && event.organizerId.toString() !== user.id) {
      return forbiddenResponse('You do not own this event');
    }

    // Total confirmed (non-waitlisted) going
    // @ts-ignore
    const totalGoing = await RSVP.countDocuments({ eventId, status: 'going', waitlistPosition: { $exists: false } });

    // Checked in count
    // @ts-ignore
    const checkedInCount = await CheckIn.countDocuments({ eventId });

    // Recent check-ins (last 20) with user info
    // @ts-ignore
    const recentRaw = await CheckIn.find({ eventId })
      .sort({ checkedInAt: -1 })
      .limit(20)
      .lean()
      .exec() as any[];

    // Fetch user names
    const userIds = recentRaw.map((c) => c.userId);
    // @ts-ignore
    const users = await User.find({ _id: { $in: userIds } }).select('name avatarUrl').lean().exec() as any[];
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const recentCheckIns = recentRaw.map((c) => {
      const u = userMap.get(c.userId.toString());
      return {
        id: c._id.toString(),
        userId: c.userId.toString(),
        userName: u?.name ?? 'Unknown',
        avatarUrl: u?.avatarUrl ?? null,
        checkedInAt: c.checkedInAt,
        source: c.source,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Check-in stats fetched',
      data: {
        eventId,
        eventTitle: event.title,
        totalGoing,
        checkedInCount,
        recentCheckIns,
      },
    });
  } catch (error) {
    console.error('Check-in GET error:', error);
    return NextResponse.json({ success: false, message: 'Server error', error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/checkin — verify QR token and record check-in
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const organizer = getCurrentUserFromRequest(request);
  if (!organizer) return unauthorizedResponse();
  if (organizer.role !== 'organizer' && organizer.role !== 'admin') return forbiddenResponse('Organizer access required');

  try {
    await connectDB();
    const body = await request.json();
    const { token, eventId } = body as { token?: string; eventId?: string };

    if (!token || !eventId) {
      return NextResponse.json({ success: false, message: 'token and eventId are required', error: 'Missing fields' }, { status: 400 });
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

    // Validate QR token
    if (!event.qrToken || event.qrToken !== token) {
      return NextResponse.json({ success: false, message: 'Invalid QR code', error: 'Token mismatch' }, { status: 400 });
    }

    // The QR code encodes the organizer's event token — we need the attendee userId separately
    // In practice the QR is shown on the attendee's device, so the payload includes their userId
    const { userId } = body as { userId?: string };
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required', error: 'Missing userId' }, { status: 400 });
    }

    // Check the attendee is RSVP'd as going (not waitlisted)
    // @ts-ignore
    const rsvp = await RSVP.findOne({ userId, eventId, status: 'going' }).lean().exec() as any;
    if (!rsvp) {
      return NextResponse.json({ success: false, message: 'Attendee is not RSVP\'d as going', error: 'Not going' }, { status: 400 });
    }
    if (rsvp.waitlistPosition != null) {
      return NextResponse.json({ success: false, message: 'Attendee is on the waitlist, not confirmed', error: 'On waitlist' }, { status: 400 });
    }

    // Record check-in (unique index prevents duplicates)
    try {
      // @ts-ignore
      await CheckIn.create({ userId, eventId, checkedInBy: organizer.id, source: 'qr' });
    } catch (err: any) {
      if (err.code === 11000) {
        return NextResponse.json({ success: false, message: 'Attendee already checked in', error: 'Duplicate check-in' }, { status: 409 });
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
        source: 'qr',
      },
    });
  } catch (error) {
    console.error('Check-in POST error:', error);
    return NextResponse.json({ success: false, message: 'Server error', error: 'Internal server error' }, { status: 500 });
  }
}
