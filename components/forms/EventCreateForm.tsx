'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { EventCategory } from '@/types';

const CATEGORIES: EventCategory[] = ['tech', 'music', 'sports', 'arts', 'food', 'business', 'education', 'community'];

interface ConflictEvent {
  _id: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
  venueName: string;
  area?: string;
}

export function EventCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'tech' as EventCategory,
    startDateTime: '',
    endDateTime: '',
    venueName: '',
    venueAddress: '',
    area: '',
    tags: '',
    capacity: '50',
    visibility: 'public',
    coverImage: '',
    status: 'draft',
  });

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Debounced conflict check
  const checkConflicts = useCallback(async (start: string, end: string, category: string, area: string) => {
    if (!start || !end || !category) return;
    setCheckingConflicts(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/events/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startDateTime: start,
          endDateTime: end,
          category,
          area: area || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConflicts(data.data.conflicts || []);
      }
    } catch {
      // ignore conflict check errors silently
    } finally {
      setCheckingConflicts(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.startDateTime && formData.endDateTime) {
        checkConflicts(formData.startDateTime, formData.endDateTime, formData.category, formData.area);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.startDateTime, formData.endDateTime, formData.category, formData.area, checkConflicts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        capacity: parseInt(formData.capacity, 10),
      };

      const response = await fetch('/api/organizer/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Failed to create event');
        return;
      }

      router.push('/organizer/events');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Event creation error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-amber-800 font-semibold text-sm mb-2 flex items-center gap-2">
            ⚡ Scheduling Conflict Detected
          </p>
          <p className="text-amber-700 text-xs mb-3">
            The following {conflicts.length > 1 ? 'events overlap' : 'event overlaps'} with your selected time and category:
          </p>
          <ul className="space-y-1">
            {conflicts.map((c) => (
              <li key={c._id} className="text-amber-800 text-xs bg-amber-100 rounded-lg px-3 py-2">
                <span className="font-medium">{c.title}</span>
                {c.area && <span className="text-amber-600"> · {c.area}</span>}
                <span className="text-amber-600"> · {new Date(c.startDateTime).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <p className="text-amber-600 text-xs mt-2">You can still create the event, but consider adjusting the schedule.</p>
        </div>
      )}
      {checkingConflicts && (
        <p className="text-xs text-neutral-400 flex items-center gap-1">
          <span className="inline-block w-3 h-3 border border-neutral-400 border-t-transparent rounded-full animate-spin" />
          Checking for scheduling conflicts…
        </p>
      )}

      {/* Section: Basic Info */}
      <div className="space-y-5">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Basic Info</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Event Title *</label>
            <Input
              placeholder="Amazing Tech Conference 2026"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white text-neutral-800"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Description *</label>
          <textarea
            placeholder="Describe your event…"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={5}
            required
            disabled={loading}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none text-neutral-800 placeholder-neutral-400"
          />
        </div>
      </div>

      {/* Section: Schedule */}
      <div className="space-y-5">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Schedule</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Start Date & Time *</label>
            <Input
              type="datetime-local"
              value={formData.startDateTime}
              onChange={(e) => updateField('startDateTime', e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">End Date & Time *</label>
            <Input
              type="datetime-local"
              value={formData.endDateTime}
              onChange={(e) => updateField('endDateTime', e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Section: Venue */}
      <div className="space-y-5">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Venue</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Venue Name *</label>
            <Input
              placeholder="Convention Center"
              value={formData.venueName}
              onChange={(e) => updateField('venueName', e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Venue Address *</label>
            <Input
              placeholder="123 Main St, City, State"
              value={formData.venueAddress}
              onChange={(e) => updateField('venueAddress', e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Area / Neighbourhood (optional)</label>
            <Input
              placeholder="Downtown"
              value={formData.area}
              onChange={(e) => updateField('area', e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Capacity *</label>
            <Input
              type="number"
              placeholder="100"
              value={formData.capacity}
              onChange={(e) => updateField('capacity', e.target.value)}
              required
              disabled={loading}
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Section: Media & Publishing */}
      <div className="space-y-5">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Media & Publishing</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tags (comma-separated)</label>
            <Input
              placeholder="networking, learning, fun"
              value={formData.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Visibility</label>
            <select
              value={formData.visibility}
              onChange={(e) => updateField('visibility', e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white text-neutral-800"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Cover Image URL (optional)</label>
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.coverImage}
              onChange={(e) => updateField('coverImage', e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Publishing Status</label>
            <select
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white text-neutral-800"
            >
              <option value="draft">Save as Draft</option>
              <option value="published">Publish Immediately</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1 md:flex-none md:min-w-[160px]">
          {loading ? 'Creating Event…' : 'Create Event'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
