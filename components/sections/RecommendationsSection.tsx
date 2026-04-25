'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import Link from 'next/link';

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
  matchReason: string;
}

interface RecommendationsSectionProps {
  title?: string;
  limit?: number;
}

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

export function RecommendationsSection({
  title = 'Recommended Events',
  limit = 4,
}: RecommendationsSectionProps) {
  const [events, setEvents] = useState<RecommendedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in to see recommendations');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/recommendations', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (data.success && data.data) {
          setEvents(data.data.slice(0, limit));
        } else {
          setError(data.message || 'Failed to load recommendations');
        }
      } catch (err) {
        console.error('Recommendations fetch error:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [limit]);

  if (loading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">✨ {title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="h-64 bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error || events.length === 0) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">✨ {title}</h2>
        <Card>
          <p className="text-neutral-600 text-center py-8">
            {error || 'No recommendations available yet. Attend more events to get personalized recommendations!'}
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">✨ {title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {events.map((event) => {
          const eventDate = new Date(event.startDateTime);
          const categoryColor = categoryColors[event.category] || categoryColors.other;
          const occupancyRate = Math.round((event.goingCount / event.capacity) * 100);

          return (
            <Link key={event._id} href={`/events/${event.slug}`}>
              <Card className="h-full hover:shadow-lg transition cursor-pointer group">
                <div className="p-4 h-full flex flex-col">
                  {/* Category Badge */}
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${categoryColor}`}>
                      {event.category}
                    </span>
                    <span className="text-xs text-primary font-semibold">{event.matchReason}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-primary transition">
                    {event.title}
                  </h3>

                  {/* Meta */}
                  <div className="space-y-2 text-xs text-neutral-600 mb-4 flex-grow">
                    <p>📅 {format(eventDate, 'MMM d, h:mm a')}</p>
                    <p>📍 {event.venueName}</p>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-neutral-200 pt-3 space-y-2">
                    {/* Rating */}
                    {event.averageRating > 0 && (
                      <p className="text-xs font-semibold text-primary">
                        ⭐ {event.averageRating.toFixed(1)} ({event.goingCount} going)
                      </p>
                    )}

                    {/* Occupancy */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-700 font-medium">Spots available</span>
                        <span className="text-neutral-600">
                          {Math.max(0, event.capacity - event.goingCount)}/{event.capacity}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary-light transition-all"
                          style={{ width: `${occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button className="w-full mt-4 text-xs py-2">View Event</Button>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
