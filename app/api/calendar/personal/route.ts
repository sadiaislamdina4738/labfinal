import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { PersonalCalendarEvent } from '@/models/PersonalCalendarEvent';
import { createNotification } from '@/lib/notification-queries';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const filter: any = { userId: user.id };
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
        // overlap the requested range
        filter.startDateTime = { $lt: endDate };
        filter.endDateTime = { $gt: startDate };
      }
    }

    // @ts-ignore
    const items = await PersonalCalendarEvent.find(filter)
      .sort({ startDateTime: 1 })
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      message: 'Personal calendar events fetched',
      data: {
        items: items.map((e: any) => ({
          id: e._id.toString(),
          title: e.title,
          notes: e.notes ?? '',
          startDateTime: e.startDateTime,
          endDateTime: e.endDateTime,
          allDay: Boolean(e.allDay),
          createdAt: e.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Personal calendar fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch calendar items', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const title = String(body?.title ?? '').trim();
    const startDateTime = new Date(body?.startDateTime);
    const endDateTime = new Date(body?.endDateTime);
    const allDay = Boolean(body?.allDay);
    const notes = String(body?.notes ?? '').trim();

    if (!title || Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', error: 'Title, start, and end are required' },
        { status: 400 }
      );
    }
    if (endDateTime <= startDateTime) {
      return NextResponse.json(
        { success: false, message: 'Invalid time range', error: 'End must be after start' },
        { status: 400 }
      );
    }

    // @ts-ignore
    const created = await PersonalCalendarEvent.create({
      userId: user.id,
      title,
      notes,
      startDateTime,
      endDateTime,
      allDay,
    });

    // Create an in-app notification so the bell updates immediately.
    await createNotification({
      recipientId: user.id,
      type: 'event_reminder',
      title: `📅 Added to calendar: ${title}`,
      message: `Saved on ${startDateTime.toLocaleDateString()} at ${startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      priority: 'low',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Saved to your calendar',
        data: {
          id: created._id.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Personal calendar create error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create calendar item', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

