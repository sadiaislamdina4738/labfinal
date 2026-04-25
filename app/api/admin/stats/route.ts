import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import { RSVP } from '@/models/RSVP';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) return unauthorizedResponse();
    if (user.role !== 'admin') return forbiddenResponse('Admin access required');

    const [totalEvents, totalUsers, totalRsvps] = await Promise.all([
      (Event as any).countDocuments({}),
      (User as any).countDocuments({}),
      (RSVP as any).countDocuments({}),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Stats fetched',
      data: {
        events: totalEvents.toString(),
        users: totalUsers.toString(),
        rsvps: totalRsvps.toString(),
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stats', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
