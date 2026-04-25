import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getEventBySlug } from '@/lib/event-queries';

// GET /api/events/[slug]/calendar — returns an .ics file
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  try {
    await connectDB();
    const event = await getEventBySlug(params.slug);

    if (!event) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    const start = new Date(event.startDateTime);
    const end = new Date(event.endDateTime);

    // Format date for ICS: YYYYMMDDTHHMMSSZ
    const formatICS = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const escapeICS = (value: string) =>
      value
        .replace(/\\/g, '\\\\')
        .replace(/\r\n/g, '\n')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');

    const uid = `${event._id}@eventease.app`;
    const now = formatICS(new Date());
    const dtStart = formatICS(start);
    const dtEnd = formatICS(end);

    const descRaw = escapeICS(event.description || '');
    const summary = escapeICS(event.title);
    const location = escapeICS(`${event.venueName}, ${event.venueAddress}`);
    const { searchParams } = new URL(request.url);
    const reminderMinutes = Number(searchParams.get('reminderMinutes') || 0);
    const hasReminder = Number.isFinite(reminderMinutes) && reminderMinutes > 0;

    const reminderBlock = hasReminder
      ? [
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${summary}`,
          `TRIGGER:-PT${Math.floor(reminderMinutes)}M`,
          'END:VALARM',
        ]
      : [];

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventEase//EventEase//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${descRaw}`,
      `LOCATION:${location}`,
      `URL:${process.env.NEXTAUTH_URL || 'http://localhost:4000'}/events/${event.slug}`,
      'STATUS:CONFIRMED',
      ...reminderBlock,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const filename = `${event.slug}.ics`;

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Calendar route error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
