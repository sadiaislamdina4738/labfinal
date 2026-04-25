import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { getEventBySlug } from '@/lib/event-queries';
import { notifyEventAttendees } from '@/lib/notification-queries';
import { EmergencyAlert } from '@/models/EmergencyAlert';
import { RSVP } from '@/models/RSVP';
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
      return forbiddenResponse('Only event organizer can send emergency alerts');
    }

    const { message, title = 'Emergency Alert', alertType = 'other' } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, message: 'Missing message', error: 'Message is required' },
        { status: 400 }
      );
    }

    const eventId = event._id.toString();

    // Get attendee count
    const attendeeCount = await RSVP.countDocuments({
      eventId: event._id,
      status: { $in: ['going', 'interested'] },
    });

    // Create emergency alert record
    const emergencyAlert = new EmergencyAlert({
      eventId: event._id,
      organizerId: user.id,
      title,
      message,
      alertType,
      recipientCount: attendeeCount,
    });

    await emergencyAlert.save();

    // Send to all attendees with urgent priority
    await notifyEventAttendees(eventId, 'emergency_alert', title, message, 'high', [user.id]);

    return NextResponse.json({
      success: true,
      message: `Emergency alert sent to ${attendeeCount} attendees`,
      data: emergencyAlert,
    });
  } catch (error) {
    console.error('Emergency alert error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send emergency alert', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
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
      return forbiddenResponse('Only event organizer can view alerts');
    }

    // @ts-ignore
    const alerts = await EmergencyAlert.find({ eventId: event._id })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      message: 'Alert history retrieved',
      data: alerts,
    });
  } catch (error) {
    console.error('Alert history error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve alert history', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
