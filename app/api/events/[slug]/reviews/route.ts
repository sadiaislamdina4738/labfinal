import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getEventBySlug } from '@/lib/event-queries';
import { RSVP } from '@/models/RSVP';
import { Review } from '@/models/Review';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import { reviewSchema } from '@/lib/validations';
import type { ApiResponse } from '@/types';

// GET /api/events/[slug]/reviews — fetch reviews for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    const event = await getEventBySlug(params.slug);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Not found' },
        { status: 404 }
      );
    }

    // Fetch all reviews for this event
    // @ts-ignore - Mongoose typing
    const reviews = await Review.find({ eventId: event._id })
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate rating distribution
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    reviews.forEach((review: any) => {
      if (review.rating >= 1 && review.rating <= 5) {
        ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
        totalRating += review.rating;
      }
    });

    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return NextResponse.json({
      success: true,
      message: 'Reviews fetched',
      data: {
        reviews: reviews.map((r: any) => ({
          id: r._id.toString(),
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          user: {
            name: r.userId?.name || 'Anonymous',
            avatarUrl: r.userId?.avatarUrl,
          },
        })),
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
        ratingDistribution,
      },
    });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch reviews', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/events/[slug]/reviews — submit or update a review
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  const user = getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized', error: 'Not authenticated' },
      { status: 401 }
    );
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

    // Check if event is in the past
    if (new Date(event.endDateTime) > new Date()) {
      return NextResponse.json(
        { success: false, message: 'Can only review completed events', error: 'Event not over' },
        { status: 400 }
      );
    }

    // Check if user has RSVP'd as "going"
    // @ts-ignore
    const userRsvp = await RSVP.findOne({
      userId: user.id,
      eventId: event._id,
      status: 'going',
    });

    if (!userRsvp) {
      return NextResponse.json(
        { success: false, message: 'Must be attending to review', error: 'No valid RSVP' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid review data', error: validation.error?.errors?.[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    // Upsert review (one per user per event)
    // @ts-ignore
    const review = await Review.findOneAndUpdate(
      { userId: user.id, eventId: event._id },
      {
        userId: user.id,
        eventId: event._id,
        rating: validation.data.rating,
        comment: validation.data.comment,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Recalculate event's average rating
    // @ts-ignore
    const allReviews = await Review.find({ eventId: event._id });
    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length
      : 0;

    // @ts-ignore
    await Event.findByIdAndUpdate(event._id, { averageRating: Math.round(avgRating * 10) / 10 });

    // Send notification to organizer (only on new review, not updates)
    if (review.isNew) {
      const { createNotification } = await import('@/lib/notification-queries');
      await createNotification({
        recipientId: event.organizerId.toString(),
        eventId: event._id.toString(),
        type: 'new_review',
        title: 'New Review',
        message: `${user.name} reviewed your event "${event.title}"`,
        priority: 'medium',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Review saved',
      data: {
        id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save review', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
