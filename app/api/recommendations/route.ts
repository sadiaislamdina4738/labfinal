import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import { RSVP } from '@/models/RSVP';
import type { ApiResponse } from '@/types';

interface RecommendedEvent {
  _id: string;
  title: string;
  slug: string;
  category: string;
  startDateTime: string;
  venueName: string;
  goingCount: number;
  capacity: number;
  averageRating: number;
  description: string;
  matchScore: number;
  matchReason: string;
}

// GET /api/recommendations — get AI-powered event recommendations for current user
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const user = getCurrentUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectDB();

    // Fetch current user's preferences
    // @ts-ignore - Mongoose typing issues with lean
    const currentUser = await User.findById(user.id).lean();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', error: 'Not found' },
        { status: 404 }
      );
    }

    // Fetch user's RSVP history to understand preferences
    // @ts-ignore - Mongoose typing issues
    const userRsvps = await RSVP.find({ userId: user.id, status: 'going' })
      .populate('eventId')
      .lean();

    // Extract categories the user has attended
    const attendedCategories: Record<string, number> = {};
    const userInterests = currentUser.interests || [];

    userRsvps.forEach((rsvp: any) => {
      if (rsvp.eventId?.category) {
        attendedCategories[rsvp.eventId.category] =
          (attendedCategories[rsvp.eventId.category] || 0) + 1;
      }
    });

    // Get all events the user is NOT already attending
    const attendingEventIds = userRsvps
      .map((rsvp: any) => rsvp.eventId?._id)
      .filter(Boolean);

    const now = new Date();
    // @ts-ignore - Mongoose typing issues with find
    const allEvents = await Event.find({
      _id: { $nin: attendingEventIds },
      startDateTime: { $gt: now },
      visibility: 'public',
      status: { $in: ['published', 'ongoing'] },
    })
      .select(
        '_id title slug category startDateTime venueName goingCount capacity averageRating description'
      )
      .lean();

    // Score and rank events based on user preferences
    const recommendedEvents = allEvents
      .map((event: any) => {
        let matchScore = 0;
        let matchReason = '';
        const reasons: string[] = [];

        // Category match (high priority)
        if (
          attendedCategories[event.category] ||
          userInterests.includes(event.category)
        ) {
          const categoryCount = attendedCategories[event.category] || 0;
          matchScore += 25 + categoryCount * 5;
          reasons.push(`Popular in your ${event.category} interests`);
        }

        // Trending events (based on going count relative to capacity)
        const occupancyRate = event.goingCount / event.capacity;
        if (occupancyRate > 0.7) {
          matchScore += 15;
          reasons.push('Trending this week');
        } else if (occupancyRate > 0.5) {
          matchScore += 10;
          reasons.push('Growing interest');
        }

        // High-rated events
        if (event.averageRating && event.averageRating >= 4.5) {
          matchScore += 20;
          reasons.push(`Highly rated (${event.averageRating.toFixed(1)} ⭐)`);
        } else if (event.averageRating && event.averageRating >= 4.0) {
          matchScore += 15;
          reasons.push(`Well-reviewed (${event.averageRating.toFixed(1)} ⭐)`);
        }

        // New events (last 7 days)
        const eventDate = new Date(event.startDateTime);
        const daysSinceNow = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceNow <= 7) {
          matchScore += 10;
          reasons.push('Happening soon');
        }

        // Available spots (inverse preference - events that aren't full are better)
        const availableSpots = event.capacity - event.goingCount;
        if (availableSpots > event.capacity * 0.3) {
          matchScore += 5;
        }

        return {
          _id: event._id.toString(),
          title: event.title,
          slug: event.slug,
          category: event.category,
          startDateTime: event.startDateTime,
          venueName: event.venueName,
          goingCount: event.goingCount,
          capacity: event.capacity,
          averageRating: event.averageRating || 0,
          description: event.description,
          matchScore,
          matchReason: reasons.length > 0 ? reasons[0] : 'Recommended for you',
        };
      })
      .filter((event: RecommendedEvent) => event.matchScore > 0)
      .sort((a: RecommendedEvent, b: RecommendedEvent) => b.matchScore - a.matchScore)
      .slice(0, 8) as RecommendedEvent[];

    return NextResponse.json({
      success: true,
      message: `Found ${recommendedEvents.length} events recommended for you`,
      data: recommendedEvents,
    });
  } catch (error) {
    console.error('Recommendations route error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
