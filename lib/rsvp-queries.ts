import { RSVP } from '@/models/RSVP';
import { Event } from '@/models/Event';
import type { IRSVP, RSVPStatus } from '@/types';

/**
 * Add or update RSVP.
 * Does NOT handle waitlist logic — call handleRSVPWithWaitlist for full flow.
 */
export async function upsertRSVP(
  userId: string,
  eventId: string,
  status: RSVPStatus,
  waitlistPosition?: number
): Promise<IRSVP> {
  const update: Record<string, any> = { userId, eventId, status, updatedAt: new Date() };
  if (waitlistPosition !== undefined) {
    update.waitlistPosition = waitlistPosition;
  } else {
    update.$unset = { waitlistPosition: 1 };
  }

  // @ts-ignore
  return await RSVP.findOneAndUpdate(
    { userId, eventId },
    waitlistPosition !== undefined
      ? { userId, eventId, status, waitlistPosition, updatedAt: new Date() }
      : { $set: { userId, eventId, status, updatedAt: new Date() }, $unset: { waitlistPosition: 1 } },
    { upsert: true, new: true }
  ).exec();
}

/**
 * Get user's RSVP for an event
 */
export async function getUserRSVP(userId: string, eventId: string): Promise<IRSVP | null> {
  // @ts-ignore
  return (await RSVP.find({ userId, eventId }).limit(1).exec())[0] || null;
}

/**
 * Get attendee count (only non-waitlisted going)
 */
export async function getAttendeeCount(eventId: string, status: RSVPStatus): Promise<number> {
  if (status === 'going') {
    // @ts-ignore
    return await RSVP.countDocuments({ eventId, status: 'going', waitlistPosition: { $exists: false } });
  }
  // @ts-ignore
  return await RSVP.countDocuments({ eventId, status });
}

/**
 * Update event counts from RSVPs
 */
export async function updateEventCounts(eventId: string): Promise<void> {
  const goingCount = await getAttendeeCount(eventId, 'going');
  const interestedCount = await getAttendeeCount(eventId, 'interested');

  // @ts-ignore
  await Event.findByIdAndUpdate(eventId, {
    goingCount,
    interestedCount,
  }).exec();
}

/**
 * Get the waitlist queue for an event, ordered by position
 */
export async function getWaitlistQueue(eventId: string): Promise<IRSVP[]> {
  // @ts-ignore
  return await RSVP.find({
    eventId,
    status: 'going',
    waitlistPosition: { $exists: true, $ne: null },
  })
    .sort({ waitlistPosition: 1 })
    .exec();
}

/**
 * Get waitlist position for a specific user, or null if not on waitlist
 */
export async function getWaitlistPosition(userId: string, eventId: string): Promise<number | null> {
  // @ts-ignore
  const rsvp = await RSVP.findOne({ userId, eventId }).exec();
  if (!rsvp || rsvp.waitlistPosition == null) return null;
  return rsvp.waitlistPosition;
}

/**
 * Promote the first person on the waitlist to a confirmed seat.
 * Sends them a notification. Returns the promoted RSVP or null if queue is empty.
 */
export async function promoteFromWaitlist(eventId: string): Promise<IRSVP | null> {
  const queue = await getWaitlistQueue(eventId);
  if (queue.length === 0 || !queue[0]) return null;

  const toPromote = queue[0];

  // Promote: remove waitlistPosition
  // @ts-ignore
  const promoted = await RSVP.findByIdAndUpdate(
    toPromote._id,
    { $unset: { waitlistPosition: 1 } },
    { new: true }
  ).exec();

  // Re-number remaining waitlist
  for (let i = 1; i < queue.length; i++) {
    // @ts-ignore
    await RSVP.findByIdAndUpdate(queue[i]._id, { waitlistPosition: i }).exec();
  }

  // Send notification to promoted user
  try {
    const { createNotification } = await import('@/lib/notification-queries');
    // @ts-ignore
    const event = await Event.findById(eventId).select('title slug').lean().exec();
    if (event) {
      await createNotification({
        recipientId: toPromote.userId.toString(),
        eventId,
        type: 'rsvp_response',
        title: '🎉 You got a spot!',
        message: `A seat opened up for "${(event as any).title}". You've been confirmed as Going!`,
        priority: 'high',
      });
    }
  } catch (err) {
    console.error('Failed to send promotion notification:', err);
  }

  return promoted;
}

/**
 * Full RSVP flow with waitlist support.
 * Returns { rsvp, onWaitlist, waitlistPosition, promoted }
 */
export async function handleRSVPWithWaitlist(
  userId: string,
  eventId: string,
  status: RSVPStatus
): Promise<{
  rsvp: IRSVP;
  onWaitlist: boolean;
  waitlistPosition?: number;
  promoted: boolean;
}> {
  // Fetch event to check capacity
  // @ts-ignore
  const event = await Event.findById(eventId).lean().exec() as any;
  if (!event) throw new Error('Event not found');

  const wasGoing = await getUserRSVP(userId, eventId);
  const wasConfirmedGoing = wasGoing?.status === 'going' && wasGoing?.waitlistPosition == null;

  let promoted = false;

  // If user was a confirmed "going" and is now cancelling/changing, free a seat
  if (wasConfirmedGoing && status !== 'going') {
    // After upsert below, promote from waitlist
    promoted = true;
  }

  if (status === 'going') {
    // Count confirmed seats (excluding this user if they were already going)
    const confirmedCount = await getAttendeeCount(eventId, 'going');
    const isAlreadyConfirmed = wasGoing?.status === 'going' && wasGoing?.waitlistPosition == null;

    const effectiveConfirmed = isAlreadyConfirmed ? confirmedCount : confirmedCount;
    const atCapacity = effectiveConfirmed >= event.capacity;

    if (atCapacity && !isAlreadyConfirmed) {
      // Add to waitlist
      const queue = await getWaitlistQueue(eventId);
      // Check if user is already on waitlist
      const existingPosition = wasGoing?.waitlistPosition;
      const newPosition = existingPosition ?? queue.length + 1;

      const rsvp = await upsertRSVP(userId, eventId, 'going', newPosition);
      await updateEventCounts(eventId);
      return { rsvp, onWaitlist: true, waitlistPosition: newPosition, promoted: false };
    } else {
      // Confirmed seat — remove from waitlist if they were on it
      const rsvp = await upsertRSVP(userId, eventId, 'going', undefined);
      await updateEventCounts(eventId);
      return { rsvp, onWaitlist: false, promoted: false };
    }
  } else {
    // interested or declined
    const rsvp = await upsertRSVP(userId, eventId, status, undefined);
    await updateEventCounts(eventId);

    if (promoted) {
      await promoteFromWaitlist(eventId);
    }

    return { rsvp, onWaitlist: false, promoted };
  }
}

/**
 * Get user's events (going/interested) with event data
 */
export async function getUserEvents(userId: string, status: RSVPStatus | 'all' = 'all') {
  const query: Record<string, any> = { userId };
  if (status !== 'all') {
    query.status = status;
  }

  // @ts-ignore
  const rsvps = await RSVP.find(query).sort({ updatedAt: -1 }).exec();

  const eventIds = rsvps.map((r: any) => r.eventId);

  // @ts-ignore
  const events = await Event.find({ _id: { $in: eventIds } }).sort({ startDateTime: 1 }).lean().exec();

  // Merge RSVP data with event data
  return rsvps.map((rsvp: any) => {
    const event = events.find((e: any) => e._id.toString() === rsvp.eventId.toString());
    return { rsvp, event };
  }).filter((item: any) => item.event != null);
}
