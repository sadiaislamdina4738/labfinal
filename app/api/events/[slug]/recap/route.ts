import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { getEventBySlug } from '@/lib/event-queries';
import { RSVP } from '@/models/RSVP';
import { Review } from '@/models/Review';
import { CheckIn } from '@/models/CheckIn';
import type { ApiResponse } from '@/types';

// POST /api/events/[slug]/recap — generate AI-style post-event recap
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  const user = getCurrentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== 'organizer' && user.role !== 'admin') {
    return forbiddenResponse('Only organizers can generate recaps');
  }

  try {
    await connectDB();
    const event = await getEventBySlug(params.slug);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Not found' },
        { status: 404 }
      );
    }

    // Ownership check
    if (user.role !== 'admin' && event.organizerId.toString() !== user.id.toString()) {
      return forbiddenResponse('You do not own this event');
    }

    const eventId = event._id;

    // Gather data
    const totalGoing = await RSVP.countDocuments({
      eventId,
      status: 'going',
      waitlistPosition: { $exists: false }
    });
    const totalInterested = await RSVP.countDocuments({
      eventId,
      status: 'interested'
    });
    const totalCheckedIn = await CheckIn.countDocuments({ eventId });
    // @ts-ignore - Mongoose typing issues with ObjectId
    const reviews = await Review.find({ eventId }).exec() as any[];

    const reviewCount = reviews.length;
    const avgRating =
      reviewCount > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
        : null;
    const comments = reviews
      .filter((r: any) => r.comment)
      .map((r: any) => r.comment as string)
      .slice(0, 10);

    const attendanceRate =
      totalGoing > 0 ? Math.round((totalCheckedIn / totalGoing) * 100) : 0;

    const now = new Date();
    const eventEnd = new Date(event.endDateTime);
    const isCompleted = eventEnd < now;

    // Rules-based AI-style recap generation
    const recap = buildRecap({
      title: event.title,
      category: event.category,
      totalGoing,
      totalInterested,
      totalCheckedIn,
      attendanceRate,
      reviewCount,
      avgRating,
      comments,
      isCompleted,
      viewsCount: event.viewsCount,
    });

    // Optionally mark the event as completed
    if (isCompleted && event.status !== 'completed') {
      const { updateEvent } = await import('@/lib/event-create');
      await updateEvent(eventId.toString(), { status: 'completed' });
    }

    return NextResponse.json({
      success: true,
      message: 'Recap generated successfully',
      data: recap,
    });
  } catch (error) {
    console.error('Recap route error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface RecapInput {
  title: string;
  category: string;
  totalGoing: number;
  totalInterested: number;
  totalCheckedIn: number;
  attendanceRate: number;
  reviewCount: number;
  avgRating: number | null;
  comments: string[];
  isCompleted: boolean;
  viewsCount: number;
}

function buildRecap(data: RecapInput) {
  const {
    title, category, totalGoing, totalInterested, totalCheckedIn,
    attendanceRate, reviewCount, avgRating, comments, isCompleted, viewsCount,
  } = data;

  // Sentiment analysis (keyword-based)
  const positiveWords = ['great', 'amazing', 'excellent', 'awesome', 'loved', 'fantastic', 'enjoyed', 'wonderful', 'perfect', 'good'];
  const negativeWords = ['bad', 'poor', 'disappointing', 'boring', 'late', 'crowded', 'noisy', 'worse', 'terrible', 'disorganized'];

  let positiveCount = 0;
  let negativeCount = 0;
  for (const c of comments) {
    const lower = c.toLowerCase();
    positiveCount += positiveWords.filter((w) => lower.includes(w)).length;
    negativeCount += negativeWords.filter((w) => lower.includes(w)).length;
  }

  const sentimentScore = positiveCount - negativeCount;
  const sentiment =
    sentimentScore > 2 ? 'very positive' :
    sentimentScore > 0 ? 'mostly positive' :
    sentimentScore === 0 ? 'neutral' : 'mixed';

  // Generate highlights
  const highlights: string[] = [];

  if (totalCheckedIn > 0) {
    highlights.push(`${totalCheckedIn} attendee${totalCheckedIn !== 1 ? 's' : ''} checked in out of ${totalGoing} confirmed`);
  }
  if (attendanceRate >= 80) {
    highlights.push(`Exceptional attendance rate of ${attendanceRate}%`);
  } else if (attendanceRate >= 50) {
    highlights.push(`Good attendance rate of ${attendanceRate}%`);
  } else if (attendanceRate > 0) {
    highlights.push(`Attendance rate of ${attendanceRate}% — room to improve next time`);
  }
  if (viewsCount > 100) {
    highlights.push(`Event page received ${viewsCount} views — strong online interest`);
  }
  if (totalInterested > 0) {
    highlights.push(`${totalInterested} additional users marked as Interested`);
  }
  if (avgRating !== null) {
    highlights.push(`Average attendee rating: ${avgRating.toFixed(1)} / 5 (${reviewCount} reviews)`);
  }

  // Suggested next steps
  const suggestions: string[] = [];
  if (attendanceRate < 70 && totalGoing > 0) {
    suggestions.push('Send earlier reminders next time to improve attendance rate');
  }
  if (reviewCount === 0) {
    suggestions.push('Encourage attendees to leave reviews to build social proof');
  }
  if (avgRating !== null && avgRating < 4) {
    suggestions.push('Consider gathering specific feedback on what could be improved');
  }
  if (totalInterested > totalCheckedIn) {
    suggestions.push('Many interested users didn\'t attend — consider a follow-up event or recording');
  }
  suggestions.push(`Share event photos and highlights to keep your ${category} community engaged`);

  // Summary text
  let summaryText = `"${title}" `;
  if (!isCompleted) {
    summaryText += 'is still ongoing. Here\'s a preliminary snapshot based on data so far.';
  } else if (totalCheckedIn === 0) {
    summaryText += 'has concluded. No check-in data was recorded — consider enabling QR check-in for your next event.';
  } else {
    summaryText += `wrapped up with ${sentiment} attendee feedback. `;
    if (attendanceRate >= 75) {
      summaryText += 'The event was well-attended and generated strong engagement.';
    } else {
      summaryText += 'There are opportunities to drive stronger attendance at future events.';
    }
  }

  return {
    summary: summaryText,
    sentiment,
    highlights,
    suggestions,
    stats: {
      totalGoing,
      totalInterested,
      totalCheckedIn,
      attendanceRate,
      reviewCount,
      avgRating,
      viewsCount,
    },
    topComments: comments.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
}
