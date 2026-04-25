import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getPublishedEvents, getCategoryCounts } from '@/lib/event-queries';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const category = searchParams.get('category') as any;
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sort') || 'upcoming') as 'newest' | 'trending' | 'upcoming';
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const area = searchParams.get('area') || undefined;

    const { events, total } = await getPublishedEvents({
      page,
      limit,
      category,
      search,
      sortBy,
      dateFrom,
      dateTo,
      area,
    });

    const categoryCounts = await getCategoryCounts();

    return NextResponse.json({
      success: true,
      message: 'Events fetched',
      data: {
        events: events.map((e) => ({
          id: e._id,
          title: e.title,
          notes: e.notes || '',
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
          averageRating: e.averageRating,
          viewsCount: e.viewsCount,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        categoryCounts,
      },
    });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
