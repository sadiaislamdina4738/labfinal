import { randomUUID } from 'crypto';
import { Event } from '@/models/Event';
import type { EventDocument } from '@/models/Event';

/**
 * Create a new event
 */
export async function createEvent(data: {
  title: string;
  slug: string;
  description: string;
  category: string;
  startDateTime: Date;
  endDateTime: Date;
  venueName: string;
  venueAddress: string;
  area?: string;
  tags?: string[];
  organizerId: string;
  capacity: number;
  visibility: string;
  coverImage?: string;
}): Promise<EventDocument> {
  // @ts-ignore
  return await Event.create({ ...data, qrToken: randomUUID() });
}

/**
 * Update event
 */
export async function updateEvent(
  id: string,
  updates: Record<string, any>
): Promise<EventDocument | null> {
  // @ts-ignore
  return await Event.findOneAndUpdate({ _id: id }, updates, { new: true }).exec();
}

/**
 * Delete event
 */
export async function deleteEvent(id: string): Promise<boolean> {
  // @ts-ignore
  const result = await Event.findByIdAndDelete(id).exec();
  return !!result;
}

/**
 * Get event by ID
 */
export async function getEventById(id: string): Promise<EventDocument | null> {
  // @ts-ignore
  return (await Event.find({ _id: id }).limit(1).exec())[0] || null;
}
