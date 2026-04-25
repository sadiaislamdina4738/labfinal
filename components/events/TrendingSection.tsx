'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

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

interface TrendingEvent {
  id: string;
  title: string;
  slug: string;
  category: string;
  startDateTime: string;
  venueName: string;
  goingCount: number;
  viewsCount: number;
  coverImage?: string;
}

export default function TrendingSection() {
  const [events, setEvents] = useState<TrendingEvent[]>([]);

  useEffect(() => {
    fetch('/api/events/trending?limit=4')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setEvents(data.data.events);
      })
      .catch(() => {});
  }, []);

  if (events.length === 0) return null;

  return (
    <section className="section-spacing bg-neutral-soft">
      <div className="container-max">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
              🔥 TRENDING NOW
            </div>
            <h2 className="text-4xl font-bold">Hot Events This Week</h2>
            <p className="text-neutral-600 mt-2">Most viewed and fastest-growing events on EventEase</p>
          </div>
          <Link
            href="/events?sort=trending"
            className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-primary border border-primary/30 px-5 py-2.5 rounded-xl hover:bg-primary/5 transition"
          >
            View All Trending →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {events.map((event, idx) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="group block bg-white rounded-2xl border border-neutral-200 hover:border-primary/30 hover:shadow-lg transition overflow-hidden"
            >
              {/* Cover / Gradient */}
              <div className="relative h-36 overflow-hidden">
                {event.coverImage ? (
                  <img
                    src={event.coverImage}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center">
                    <span className="text-4xl opacity-50">
                      {event.category === 'music' ? '🎵' :
                       event.category === 'tech' ? '💻' :
                       event.category === 'food' ? '🍽️' :
                       event.category === 'sports' ? '⚽' : '🎉'}
                    </span>
                  </div>
                )}
                {/* Rank badge */}
                <div className="absolute top-2 left-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-sm font-bold text-neutral-800 shadow-sm">
                  {idx + 1}
                </div>
                {/* Trending badge */}
                <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  🔥
                </div>
              </div>

              <div className="p-4">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize mb-2 ${categoryColors[event.category] || 'bg-neutral-100 text-neutral-600'}`}>
                  {event.category}
                </span>
                <h3 className="font-bold text-neutral-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition">
                  {event.title}
                </h3>
                <p className="text-xs text-neutral-500 mb-3">
                  📅 {format(new Date(event.startDateTime), 'MMM d, h:mm a')}
                </p>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>✅ {event.goingCount} going</span>
                  <span>👁 {event.viewsCount} views</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link
            href="/events?sort=trending"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary border border-primary/30 px-5 py-2.5 rounded-xl hover:bg-primary/5 transition"
          >
            View All Trending →
          </Link>
        </div>
      </div>
    </section>
  );
}
