import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Event } from '@/models/Event';
import type { ApiResponse } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const body = await request.json();
    const rawNotes = typeof body?.notes === 'string' ? body.notes : '';
    const notes = rawNotes.trim();

    if (!notes) {
      return NextResponse.json(
        { success: false, message: 'Notes cannot be empty', error: 'Notes cannot be empty' },
        { status: 400 }
      );
    }

    // We intentionally treat `[slug]` as `:id` for this route to match `/events/:id/notes`.
    const updatedEvent = await Event.findByIdAndUpdate(
      params.slug,
      { notes },
      { new: true }
    ).exec();

    if (!updatedEvent) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event notes updated',
      data: updatedEvent,
    });
  } catch (error) {
    console.error('Event note update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update event notes', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    // We intentionally treat `[slug]` as `:id` for this route to match `/events/:id/notes`.
    const updatedEvent = await Event.findByIdAndUpdate(
      params.slug,
      { notes: '' },
      { new: true }
    ).exec();

    if (!updatedEvent) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event notes cleared',
      data: updatedEvent,
    });
  } catch (error) {
    console.error('Event note clear error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear event notes', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
