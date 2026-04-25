import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getUserEvents } from '@/lib/rsvp-queries';
import type { ApiResponse, RSVPStatus } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as RSVPStatus | 'all' | null;
    const status: RSVPStatus | 'all' = statusFilter && ['going', 'interested', 'declined', 'all'].includes(statusFilter)
      ? statusFilter
      : 'all';

    const items = await getUserEvents(user.id, status);

    const serialized = items.map(({ rsvp, event }: any) => ({
      rsvp: {
        id: rsvp._id.toString(),
        status: rsvp.status,
        onWaitlist: rsvp.waitlistPosition != null,
        waitlistPosition: rsvp.waitlistPosition ?? null,
        updatedAt: rsvp.updatedAt,
      },
      event: {
        id: event._id.toString(),
        title: event.title,
        slug: event.slug,
        category: event.category,
        coverImage: event.coverImage,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        area: event.area,
        capacity: event.capacity,
        goingCount: event.goingCount,
        interestedCount: event.interestedCount,
        status: event.status,
      },
    }));

    return NextResponse.json({
      success: true,
      message: 'My events fetched',
      data: { items: serialized, total: serialized.length },
    });
  } catch (error) {
    console.error('My events fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
