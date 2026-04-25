import { Event } from '@/models/Event';
import type { EventDocument } from '@/models/Event';
import type { EventCategory } from '@/types';

/**
 * Find published events with pagination and filters
 */
export async function getPublishedEvents(options: {
  page?: number;
  limit?: number;
  category?: EventCategory;
  search?: string;
  sortBy?: 'newest' | 'trending' | 'upcoming';
  dateFrom?: string;
  dateTo?: string;
  area?: string;
} = {}): Promise<{ events: EventDocument[]; total: number }> {
  const { page = 1, limit = 12, category, search, sortBy = 'upcoming', dateFrom, dateTo, area } = options;
  const skip = (page - 1) * limit;

  // @ts-ignore - Mongoose typing issues
  const query: Record<string, any> = {
    status: 'published',
    visibility: 'public',
  };

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  // Date range filtering
  if (dateFrom || dateTo) {
    query.startDateTime = {};
    if (dateFrom) {
      query.startDateTime.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      query.startDateTime.$lte = new Date(dateTo);
    }
  }

  // Area/location filtering
  if (area) {
    query.area = { $regex: area, $options: 'i' };
  }

  let sortQuery: Record<string, 1 | -1> = {};
  if (sortBy === 'trending') {
    sortQuery = { trendingScore: -1, startDateTime: 1 };
  } else if (sortBy === 'newest') {
    sortQuery = { createdAt: -1 };
  } else {
    sortQuery = { startDateTime: 1 };
  }

  // @ts-ignore - TypeScript Mongoose issue
  const events = await Event.find(query)
    .sort(sortQuery)
    .skip(skip)
    .limit(limit)
    .exec();

  // @ts-ignore
  const total = await Event.countDocuments(query);

  return { events: events as EventDocument[], total };
}

/**
 * Find event by slug
 */
export async function getEventBySlug(slug: string): Promise<EventDocument | null> {
  // @ts-ignore
  return (await Event.find({ slug: slug.toLowerCase() }).limit(1).exec())[0] || null;
}

/**
 * Find event by ID
 */
export async function getEventById(id: string): Promise<EventDocument | null> {
  // @ts-ignore
  return (await Event.find({ _id: id }).limit(1).exec())[0] || null;
}

/**
 * Get upcoming events for organizer
 */
export async function getOrganizerEvents(
  organizerId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ events: EventDocument[]; total: number }> {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  // @ts-ignore
  const events = await Event.find({ organizerId })
    .sort({ startDateTime: 1 })
    .skip(skip)
    .limit(limit)
    .exec();

  // @ts-ignore
  const total = await Event.countDocuments({ organizerId });

  return { events: events as EventDocument[], total };
}

/**
 * Get event categories with counts
 */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  // @ts-ignore
  const results = await Event.aggregate([
    { $match: { status: 'published', visibility: 'public' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const counts: Record<string, number> = {};
  for (const result of results) {
    counts[result._id] = result.count;
  }
  return counts;
}

/**
 * Increment view count and recalculate trendingScore
 */
export async function incrementEventViews(eventId: string): Promise<void> {
  // @ts-ignore
  const event = await Event.findByIdAndUpdate(
    eventId,
    { $inc: { viewsCount: 1 } },
    { new: true }
  ).exec() as any;

  if (!event) return;

  // Recalculate trending score:
  // views * 0.5 + going * 3 + interested * 1.5 + recency boost
  const now = new Date();
  const start = new Date(event.startDateTime);
  const daysUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const recencyBoost = daysUntil >= 0 && daysUntil <= 30 ? 10 : 0;

  const score =
    (event.viewsCount * 0.5) +
    (event.goingCount * 3) +
    (event.interestedCount * 1.5) +
    recencyBoost;

  // @ts-ignore
  await Event.findByIdAndUpdate(eventId, { trendingScore: Math.round(score) }).exec();
}

/**
 * Get top trending events for the home page
 */
export async function getTrendingEvents(limit = 4): Promise<EventDocument[]> {
  // @ts-ignore
  const events = await Event.find({ status: 'published', visibility: 'public' })
    .sort({ trendingScore: -1, goingCount: -1 })
    .limit(limit)
    .exec();
  return events as EventDocument[];
}

