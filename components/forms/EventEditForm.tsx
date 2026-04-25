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

interface EventEditFormProps {
  eventId: string;
}

function formatDateTimeLocal(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventEditForm({ eventId }: EventEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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

  // Fetch event data on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`/api/organizer/events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.event) {
          const e = data.data.event;
          setFormData({
            title: e.title || '',
            description: e.description || '',
            category: e.category || 'tech',
            startDateTime: e.startDateTime ? formatDateTimeLocal(e.startDateTime) : '',
            endDateTime: e.endDateTime ? formatDateTimeLocal(e.endDateTime) : '',
            venueName: e.venueName || '',
            venueAddress: e.venueAddress || '',
            area: e.area || '',
            tags: Array.isArray(e.tags) ? e.tags.join(', ') : '',
            capacity: String(e.capacity || 50),
            visibility: e.visibility || 'public',
            coverImage: e.coverImage || '',
            status: e.status || 'draft',
          });
        } else {
          setError(data.message || 'Failed to load event');
        }
      })
      .catch(() => setError('Failed to load event data'))
      .finally(() => setLoading(false));
  }, [eventId, router]);

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
          excludeEventId: eventId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConflicts(data.data.conflicts || []);
      }
    } catch {
      // ignore conflict check errors
    } finally {
      setCheckingConflicts(false);
    }
  }, [eventId]);

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
    setSaving(true);

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

      const response = await fetch(`/api/organizer/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Failed to update event');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/organizer/events'), 1200);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Event update error:', err);
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 text-sm">Loading event…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Status messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm flex items-center gap-2">
          <span>✅</span>
          <span>Event updated successfully! Redirecting…</span>
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
          <p className="text-amber-600 text-xs mt-2">You can still save, but consider adjusting the schedule.</p>
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
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              disabled={saving}
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
            disabled={saving}
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
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">End Date & Time *</label>
            <Input
              type="datetime-local"
              value={formData.endDateTime}
              onChange={(e) => updateField('endDateTime', e.target.value)}
              required
              disabled={saving}
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
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Venue Address *</label>
            <Input
              placeholder="123 Main St, City, State"
              value={formData.venueAddress}
              onChange={(e) => updateField('venueAddress', e.target.value)}
              required
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Visibility</label>
            <select
              value={formData.visibility}
              onChange={(e) => updateField('visibility', e.target.value)}
              disabled={saving}
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
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Status</label>
            <select
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value)}
              disabled={saving}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white text-neutral-800"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving || success} className="flex-1 md:flex-none md:min-w-[160px]">
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/organizer/events')}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
