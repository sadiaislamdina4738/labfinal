import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import connectDB from '@/lib/db';
import { getEventBySlug, incrementEventViews } from '@/lib/event-queries';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import type { ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    const event = await getEventBySlug(params.slug);

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Event not found' },
        { status: 404 }
      );
    }

    // Auto-generate a qrToken if this event doesn't have one yet
    let qrToken = event.qrToken;
    if (!qrToken) {
      qrToken = randomUUID();
      // @ts-ignore
      await Event.findByIdAndUpdate(event._id, { qrToken }).exec();
    }

    // Increment view count
    await incrementEventViews(event._id.toString());

    // Fetch organizer info
    // @ts-ignore
    const organizer = await User.find({ _id: event.organizerId }).limit(1).exec();
    const organizerData = organizer[0];

    return NextResponse.json({
      success: true,
      message: 'Event fetched',
      data: {
        id: event._id,
        title: event.title,
        notes: event.notes || '',
        slug: event.slug,
        description: event.description,
        category: event.category,
        coverImage: event.coverImage,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        area: event.area,
        tags: event.tags,
        capacity: event.capacity,
        goingCount: event.goingCount,
        interestedCount: event.interestedCount,
        averageRating: event.averageRating,
        viewsCount: event.viewsCount,
        qrToken,
        organizerId: event.organizerId?.toString() ?? null,
        organizer: organizerData
          ? {
              id: organizerData._id,
              name: organizerData.name,
              avatarUrl: organizerData.avatarUrl,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Event fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch event', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
