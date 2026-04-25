import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { getEventBySlug } from '@/lib/event-queries';
import { notifyEventAttendees } from '@/lib/notification-queries';
import type { ApiResponse } from '@/types';

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

    if (event.organizerId.toString() !== user.id) {
      return forbiddenResponse('Only event organizer can send announcements');
    }

    const { message, title = 'Event Announcement' } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, message: 'Missing message', error: 'Message is required' },
        { status: 400 }
      );
    }

    const eventId = event._id.toString();
    await notifyEventAttendees(eventId, 'announcement', title, message, 'high', [user.id]);

    return NextResponse.json({
      success: true,
      message: 'Announcement sent to all attendees',
    });
  } catch (error) {
    console.error('Announcement error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send announcement', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
