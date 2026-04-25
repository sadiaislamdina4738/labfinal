import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { createEvent } from '@/lib/event-create';
import { isOrganizer } from '@/lib/permissions';
import { Event } from '@/models/Event';
import { createNotification } from '@/lib/notification-queries';
import type { ApiResponse } from '@/types';

// GET - List organizer's own events
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!isOrganizer(user.role)) {
      return forbiddenResponse('Only organizers can access this endpoint');
    }

    const events = await (Event as any)
      .find({ organizerId: user.id })
      .sort({ createdAt: -1 })
      .select('_id title slug startDateTime endDateTime category status goingCount capacity coverImage qrToken')
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      message: 'Events fetched',
      data: { events },
    });
  } catch (error) {
    console.error('Organizer events fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create event
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!isOrganizer(user.role)) {
      return forbiddenResponse('Only organizers can create events');
    }

    const body = await request.json();
    const { title, description, category, startDateTime, endDateTime, venueName, venueAddress, area, tags, capacity, visibility, coverImage, status } = body;

    // Validation
    if (!title || !description || !category || !startDateTime || !endDateTime || !venueName || !venueAddress || !capacity) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields', error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    const slug = `${baseSlug}-${Date.now()}`;

    const event = await createEvent({
      title,
      slug,
      description,
      category,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      venueName,
      venueAddress,
      area,
      tags,
      organizerId: user.id,
      capacity,
      visibility: visibility || 'public',
      coverImage,
    });

    // If status is being set on create (e.g. published immediately)
    if (status && status !== 'draft') {
      await (Event as any).findByIdAndUpdate(event._id, { status });
    }

    await createNotification({
      recipientId: user.id,
      eventId: event._id.toString(),
      type: 'event_update',
      title: `✅ Event created: ${event.title}`,
      message: `Your event "${event.title}" was created successfully.`,
      priority: 'high',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Event created successfully',
        data: {
          id: event._id,
          title: event.title,
          slug: event.slug,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create event', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
