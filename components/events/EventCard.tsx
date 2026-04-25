import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import type { EventDocument } from '@/models/Event';

export interface EventCardProps {
  event: EventDocument;
  showOrganizer?: boolean;
}

export function EventCard({ event, showOrganizer }: EventCardProps) {
  const startDate = new Date(event.startDateTime);
  const isUpcoming = startDate > new Date();

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

  const categoryColor = categoryColors[event.category] || categoryColors.other;

  return (
    <Link href={`/events/${event.slug}`}>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md transition cursor-pointer h-full flex flex-col">
        {/* Cover Image */}
        {event.coverImage ? (
          <div className="w-full h-40 bg-gradient-to-br from-primary-light to-primary overflow-hidden">
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover hover:scale-105 transition"
            />
          </div>
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-primary-light to-primary" />
        )}

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Category & Status */}
          <div className="flex gap-2 mb-2">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${categoryColor}`}>
              {event.category}
            </span>
            {isUpcoming && (
              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Upcoming
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-lg mb-2 line-clamp-2 text-neutral-900">
            {event.title}
          </h3>

          {event.notes && (
            <p className="text-sm text-neutral-700 mb-2 line-clamp-2">
              📝 {event.notes}
            </p>
          )}

          {/* Date & Time */}
          <p className="text-sm text-neutral-600 mb-2">
            {format(startDate, 'MMM d, yyyy')} • {format(startDate, 'h:mm a')}
          </p>

          {/* Venue */}
          <p className="text-sm text-neutral-600 mb-3 line-clamp-1">
            📍 {event.venueName}
          </p>

          {/* Stats - Spacer grows to push this to bottom */}
          <div className="mt-auto pt-3 border-t border-neutral-100 flex justify-between text-xs text-neutral-600">
            <span>👥 {event.goingCount} going</span>
            <span>⭐ {event.averageRating.toFixed(1)}</span>
            <span>👁 {event.viewsCount}</span>
          </div>

          {/* Capacity */}
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <div className="text-xs text-neutral-600 mb-1">
              {event.capacity - event.goingCount} spots left
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition"
                style={{
                  width: `${Math.min((event.goingCount / event.capacity) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
