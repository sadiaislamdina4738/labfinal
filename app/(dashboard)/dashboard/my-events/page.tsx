'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import Link from 'next/link';

interface RSVPItem {
  rsvp: {
    id: string;
    status: 'going' | 'interested' | 'declined';
    onWaitlist: boolean;
    waitlistPosition: number | null;
    updatedAt: string;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    category: string;
    coverImage?: string;
    startDateTime: string;
    endDateTime: string;
    venueName: string;
    venueAddress: string;
    area?: string;
    capacity: number;
    goingCount: number;
    interestedCount: number;
    status: string;
  };
}

type TabKey = 'going' | 'interested' | 'past';

const categoryColors: Record<string, string> = {
  tech: 'bg-blue-100 text-blue-800',
  music: 'bg-purple-100 text-purple-800',
  sports: 'bg-green-100 text-green-800',
  arts: 'bg-pink-100 text-pink-800',
  food: 'bg-orange-100 text-orange-800',
  business: 'bg-gray-100 text-gray-800',
  education: 'bg-yellow-100 text-yellow-800',
  community: 'bg-red-100 text-red-800',
  other: 'bg-neutral-100 text-neutral-800',
};

function EventRSVPCard({
  item,
  onCancelRSVP,
  cancelling,
}: {
  item: RSVPItem;
  onCancelRSVP: (slug: string) => void;
  cancelling: string | null;
}) {
  const { rsvp, event } = item;
  const startDate = new Date(event.startDateTime);
  const isPast = startDate < new Date();
  const categoryColor = categoryColors[event.category] || categoryColors.other;
  const isCancelled = event.status === 'cancelled';

  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        {/* Color strip / image */}
        <div className="sm:w-32 h-24 sm:h-auto bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
          {event.coverImage ? (
            <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">🎉</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex gap-2 mb-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${categoryColor}`}>
                  {event.category}
                </span>
                {rsvp.onWaitlist && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                    ⏳ Waitlist #{rsvp.waitlistPosition}
                  </span>
                )}
                {isCancelled && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800">
                    Cancelled
                  </span>
                )}
                {isPast && !isCancelled && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-600">
                    Past
                  </span>
                )}
              </div>
              <h3 className="font-bold text-neutral-900 text-base leading-tight">
                <Link href={`/events/${event.slug}`} className="hover:text-primary transition">
                  {event.title}
                </Link>
              </h3>
            </div>

            {/* RSVP Status badge */}
            <div className="flex flex-col items-end gap-1">
              {rsvp.status === 'going' && !rsvp.onWaitlist && (
                <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded-lg">✅ Going</span>
              )}
              {rsvp.status === 'going' && rsvp.onWaitlist && (
                <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-800 rounded-lg">⏳ Waitlisted</span>
              )}
              {rsvp.status === 'interested' && (
                <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded-lg">♡ Interested</span>
              )}
            </div>
          </div>

          <div className="text-sm text-neutral-600 space-y-0.5 mb-3">
            <p>📅 {format(startDate, 'EEE, MMM d yyyy')} · {format(startDate, 'h:mm a')}</p>
            <p>📍 {event.venueName}{event.area ? `, ${event.area}` : ''}</p>
            {rsvp.status === 'going' && !rsvp.onWaitlist && (
              <p className="text-neutral-500">
                {Math.max(0, event.capacity - event.goingCount)} of {event.capacity} spots left
              </p>
            )}
          </div>

          {/* Actions */}
          {!isPast && !isCancelled && (
            <div className="flex gap-2 flex-wrap">
              <Link href={`/events/${event.slug}`}>
                <Button variant="outline" className="text-sm py-1 px-3">
                  View Event
                </Button>
              </Link>
              <Button
                variant="outline"
                className="text-sm py-1 px-3 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onCancelRSVP(event.slug)}
                disabled={cancelling === event.slug}
              >
                {cancelling === event.slug ? 'Cancelling...' : 'Cancel RSVP'}
              </Button>
            </div>
          )}

          {isPast && !isCancelled && (
            <Link href={`/events/${event.slug}`}>
              <Button variant="outline" className="text-sm py-1 px-3">
                View & Review
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('going');
  const [allItems, setAllItems] = useState<RSVPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };

  const fetchMyEvents = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('Please log in to view your events');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/rsvp/my-events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Failed to load events');
        return;
      }

      setAllItems(data.data.items || []);
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('My events error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyEvents();
  }, [fetchMyEvents]);

  const handleCancelRSVP = async (slug: string) => {
    const token = getToken();
    if (!token) return;

    setCancelling(slug);
    setCancelMessage(null);

    try {
      const res = await fetch(`/api/events/${slug}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'declined' }),
      });

      const data = await res.json();

      if (data.success) {
        setCancelMessage('RSVP cancelled. A waitlisted attendee may have been promoted.');
        await fetchMyEvents();
      }
    } catch (err) {
      console.error('Cancel RSVP error:', err);
    } finally {
      setCancelling(null);
    }
  };

  const now = new Date();

  const goingItems = allItems.filter(
    (i) => i.rsvp.status === 'going' && new Date(i.event.startDateTime) >= now
  );
  const interestedItems = allItems.filter(
    (i) => i.rsvp.status === 'interested' && new Date(i.event.startDateTime) >= now
  );
  const pastItems = allItems.filter(
    (i) =>
      new Date(i.event.startDateTime) < now ||
      i.event.status === 'cancelled'
  );

  const tabItems: Record<TabKey, RSVPItem[]> = {
    going: goingItems,
    interested: interestedItems,
    past: pastItems,
  };

  const tabLabels: Record<TabKey, string> = {
    going: `Going (${goingItems.length})`,
    interested: `Interested (${interestedItems.length})`,
    past: `Past / Cancelled (${pastItems.length})`,
  };

  const currentItems = tabItems[activeTab];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">My Events</h1>
        <div className="flex justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">My Events</h1>
        <Card className="p-8 text-center">
          <p className="text-neutral-600 mb-4">{error}</p>
          <Link href="/login">
            <Button variant="primary">Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">My Events</h1>
        <p className="text-neutral-600">
          Track your RSVPs, waitlist positions, and past events.{' '}
          <Link href="/calendar" className="text-primary font-medium hover:underline">
            Open month calendar →
          </Link>
        </p>
      </div>

      {/* Cancel feedback */}
      {cancelMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
          ✅ {cancelMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {(Object.keys(tabLabels) as TabKey[]).map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      {currentItems.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-4">
            {activeTab === 'going' ? '🎟️' : activeTab === 'interested' ? '📌' : '📅'}
          </p>
          <p className="text-neutral-600 text-lg mb-4">
            {activeTab === 'going'
              ? "You haven't RSVPed to any upcoming events yet"
              : activeTab === 'interested'
              ? "You haven't marked any events as interested"
              : "No past events"}
          </p>
          <Link href="/events">
            <Button variant="primary">Browse Events</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {currentItems.map((item) => (
            <EventRSVPCard
              key={item.rsvp.id}
              item={item}
              onCancelRSVP={handleCancelRSVP}
              cancelling={cancelling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
