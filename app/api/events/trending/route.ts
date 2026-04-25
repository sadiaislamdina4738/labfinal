import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getTrendingEvents } from '@/lib/event-queries';
import type { ApiResponse } from '@/types';

// GET /api/events/trending?limit=4
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '4', 10), 10);

    const events = await getTrendingEvents(limit);

    return NextResponse.json({
      success: true,
      message: 'Trending events fetched',
      data: {
        events: events.map((e) => ({
          id: e._id,
          title: e.title,
          slug: e.slug,
          description: e.description,
          category: e.category,
          coverImage: e.coverImage,
          startDateTime: e.startDateTime,
          endDateTime: e.endDateTime,
          venueName: e.venueName,
          venueAddress: e.venueAddress,
          capacity: e.capacity,
          goingCount: e.goingCount,
          interestedCount: e.interestedCount,
          viewsCount: e.viewsCount,
          trendingScore: e.trendingScore,
          averageRating: e.averageRating,
        })),
      },
    });
  } catch (error) {
    console.error('Trending events error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
