'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EventCard } from '@/components/events/EventCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { EventCategory } from '@/types';

const CATEGORIES: EventCategory[] = ['tech', 'music', 'sports', 'arts', 'food', 'business', 'education', 'community'];

interface EventData {
  id: string;
  title: string;
  notes: string;
  slug: string;
  description: string;
  category: EventCategory;
  coverImage?: string;
  startDateTime: string;
  endDateTime: string;
  venueName: string;
  venueAddress: string;
  capacity: number;
  goingCount: number;
  averageRating: number;
  viewsCount: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function EventsContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | ''>(() => (searchParams.get('category') as EventCategory) || '');
  const [sortBy, setSortBy] = useState<'newest' | 'trending' | 'upcoming'>('upcoming');
  const [currentPage, setCurrentPage] = useState(() => parseInt(searchParams.get('page') || '1', 10));
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || '');
  const [area, setArea] = useState(() => searchParams.get('area') || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '12',
          ...(selectedCategory && { category: selectedCategory }),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo }),
          ...(area && { area }),
          sort: sortBy,
        });

        const response = await fetch(`/api/events?${params}`);
        const data = await response.json();

        if (data.success) {
          setEvents(data.data.events);
          setPagination(data.data.pagination);
          setCategoryCounts(data.data.categoryCounts);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [currentPage, selectedCategory, debouncedSearch, sortBy, dateFrom, dateTo, area]);

  const handleCategoryChange = (category: EventCategory | '') => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-neutral-soft py-12">
      <div className="container-max">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Explore Events</h1>
          <p className="text-neutral-600">Discover amazing events happening near you</p>
        </div>

        {/* Search & Filters */}
        <div className="grid lg:grid-cols-4 gap-8 mb-12">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 sticky top-20">
              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Search</label>
                <Input
                  placeholder="Event name or tag..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {/* Sort */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="trending">Trending</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Area/Location */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Location / Area</label>
                <Input
                  placeholder="e.g., Downtown, Brooklyn..."
                  value={area}
                  onChange={(e) => {
                    setArea(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">Categories</label>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCategoryChange('')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedCategory === ''
                        ? 'bg-primary text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
                    }`}
                  >
                    All Events
                  </button>
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        selectedCategory === category
                          ? 'bg-primary text-white'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}{' '}
                      <span className="float-right text-xs opacity-75">
                        {categoryCounts[category] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Events Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-neutral-600">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <p className="text-neutral-600 mb-4">No events found</p>
                <Button onClick={() => handleCategoryChange('')}>Clear Filters</Button>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event as any}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 pt-8">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const page = Math.max(1, currentPage - 2) + i;
                      if (page > pagination.pages) return null;
                      return (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={page === currentPage ? 'primary' : 'outline'}
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                      disabled={currentPage === pagination.pages}
                      variant="outline"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <EventsContent />
    </Suspense>
  );
}
