import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { getEventById, updateEvent, deleteEvent } from '@/lib/event-create';
import { notifyEventAttendees } from '@/lib/notification-queries';
import type { ApiResponse } from '@/types';

// GET - Fetch single event for organizer editing
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const event = await getEventById(params.id);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.organizerId.toString() !== user.id) {
      return forbiddenResponse('You can only view your own events');
    }

    return NextResponse.json({
      success: true,
      message: 'Event fetched',
      data: { event },
    });
  } catch (error) {
    console.error('Event fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch event', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update event
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const event = await getEventById(params.id);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.organizerId.toString() !== user.id) {
      return forbiddenResponse('You can only edit your own events');
    }

    const body = await request.json();
    const allowedUpdates = [
      'title', 'description', 'category', 'startDateTime', 'endDateTime',
      'venueName', 'venueAddress', 'area', 'tags', 'capacity',
      'visibility', 'coverImage', 'status',
    ];
    const filteredUpdates: Record<string, any> = {};

    for (const key of allowedUpdates) {
      if (key in body) {
        if (key === 'startDateTime' || key === 'endDateTime') {
          filteredUpdates[key] = new Date(body[key]);
        } else {
          filteredUpdates[key] = body[key];
        }
      }
    }

    const changedFieldLabels: string[] = [];
    const fieldLabels: Record<string, string> = {
      title: 'title',
      description: 'description',
      category: 'category',
      startDateTime: 'start time',
      endDateTime: 'end time',
      venueName: 'venue',
      venueAddress: 'venue address',
      area: 'area',
      tags: 'tags',
      capacity: 'capacity',
      status: 'status',
    };

    for (const key of Object.keys(filteredUpdates)) {
      if (!Object.prototype.hasOwnProperty.call(fieldLabels, key)) continue;
      const oldValue = (event as any)[key];
      const newValue = filteredUpdates[key];
      const oldComparable = oldValue instanceof Date ? oldValue.getTime() : JSON.stringify(oldValue);
      const newComparable = newValue instanceof Date ? newValue.getTime() : JSON.stringify(newValue);
      if (oldComparable !== newComparable) {
        const label = fieldLabels[key];
        if (label) changedFieldLabels.push(label);
      }
    }

    const updatedEvent = await updateEvent(params.id, filteredUpdates);

    if (!updatedEvent) {
      return NextResponse.json(
        { success: false, message: 'Failed to update event', error: 'Update failed' },
        { status: 400 }
      );
    }

    if (changedFieldLabels.length > 0) {
      await notifyEventAttendees(
        updatedEvent._id.toString(),
        'event_update',
        `Event updated: ${updatedEvent.title}`,
        `Organizer updated this event (${changedFieldLabels.join(', ')}). Check latest details before attending.`,
        'medium',
        [user.id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        id: updatedEvent._id,
        title: updatedEvent.title,
        slug: updatedEvent.slug,
      },
    });
  } catch (error) {
    console.error('Event update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update event', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const event = await getEventById(params.id);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.organizerId.toString() !== user.id) {
      return forbiddenResponse('You can only delete your own events');
    }

    const deleted = await deleteEvent(params.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete event', error: 'Delete failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Event delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete event', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
