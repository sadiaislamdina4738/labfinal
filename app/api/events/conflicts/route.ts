import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { Event } from '@/models/Event';
import type { ApiResponse } from '@/types';

/**
 * POST /api/events/conflicts
 * Body: { startDateTime, endDateTime, category, area?, excludeEventId? }
 * Returns conflicting published events in same area/category during the time window.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { startDateTime, endDateTime, category, area, excludeEventId } = body;

    if (!startDateTime || !endDateTime || !category) {
      return NextResponse.json(
        { success: false, message: 'startDateTime, endDateTime and category are required', error: 'Validation failed' },
        { status: 400 }
      );
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    // Find events that overlap in time AND share the same category (and area if provided)
    const query: Record<string, any> = {
      status: { $in: ['published', 'draft'] },
      category,
      // Overlap condition: existing.start < new.end AND existing.end > new.start
      startDateTime: { $lt: end },
      endDateTime: { $gt: start },
    };

    if (area) {
      query.area = area;
    }

    if (excludeEventId) {
      query._id = { $ne: excludeEventId };
    }

    const conflicts = await (Event as any)
      .find(query)
      .select('_id title startDateTime endDateTime venueName area category')
      .limit(5)
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      message: 'Conflict check complete',
      data: { conflicts },
    });
  } catch (error) {
    console.error('Conflict check error:', error);
    return NextResponse.json(
      { success: false, message: 'Conflict check failed', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
