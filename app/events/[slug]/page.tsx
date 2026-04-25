'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReviewSection } from '@/components/sections/ReviewSection';
import { PhotoWallSection } from '@/components/sections/PhotoWallSection';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import Link from 'next/link';

interface EventDetails {
  id: string;
  title: string;
  notes: string;
  slug: string;
  description: string;
  category: string;
  coverImage?: string;
  startDateTime: string;
  endDateTime: string;
  venueName: string;
  venueAddress: string;
  area?: string;
  tags?: string[];
  capacity: number;
  goingCount: number;
  interestedCount: number;
  averageRating: number;
  viewsCount: number;
  qrToken?: string;
  organizerId?: string;
  organizer?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface RSVPState {
  status: 'going' | 'interested' | 'declined' | null;
  onWaitlist: boolean;
  waitlistPosition: number | null;
}

interface ConflictEvent {
  id: string;
  title: string;
  slug: string;
  startDateTime: string;
  endDateTime: string;
  venueName: string;
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

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rsvp, setRsvp] = useState<RSVPState>({ status: null, onWaitlist: false, waitlistPosition: null });
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [rsvpSuccess, setRsvpSuccess] = useState<string | null>(null);

  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [remindLoading, setRemindLoading] = useState(false);
  const [remindMsg, setRemindMsg] = useState<string | null>(null);
  const [calendarReminderMinutes, setCalendarReminderMinutes] = useState<number>(30);
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapData, setRecapData] = useState<any>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'venue_change' | 'weather' | 'safety' | 'cancellation' | 'other'>('other');
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };

  // Fetch event data
  useEffect(() => {
    async function fetchEvent() {
      try {
        const response = await fetch(`/api/events/${slug}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Event not found');
          return;
        }

        setEvent(data.data);
        setNoteDraft(data.data.notes || '');
      } catch (err) {
        setError('Failed to load event');
        console.error('Event fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [slug]);

  // Check auth and fetch current RSVP status
  useEffect(() => {
    const token = getToken();
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      setIsLoggedIn(true);
      try {
        const u = JSON.parse(userStr);
        setCurrentUserId(u.id ?? null);
        setCurrentUserRole(u.role ?? null);
      } catch { /* ignore */ }
    }
  }, []);

  const fetchRSVP = useCallback(async (eventSlug: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/events/${eventSlug}/rsvp`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRsvp({
          status: data.data.status,
          onWaitlist: data.data.onWaitlist ?? false,
          waitlistPosition: data.data.waitlistPosition ?? null,
        });
      }
    } catch (err) {
      console.error('RSVP fetch error:', err);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && slug) {
      fetchRSVP(slug);
    }
  }, [isLoggedIn, slug, fetchRSVP]);

  // Fetch conflicts when we know the event ID and user is logged in
  const fetchConflicts = useCallback(async (eventId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/rsvp/conflicts?eventId=${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.conflicts?.length > 0) {
        setConflicts(data.data.conflicts);
      }
    } catch (err) {
      console.error('Conflict check error:', err);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && event?.id) {
      fetchConflicts(event.id);
    }
  }, [isLoggedIn, event?.id, fetchConflicts]);

  // Generate QR code when event data arrives
  useEffect(() => {
    if (!event?.qrToken) return;
    const qrUrl = `${window.location.origin}/events/${event.slug}?ref=qr`;
    QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => {});
  }, [event?.qrToken, event?.slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    window.open(`/api/events/${event.slug}/calendar?reminderMinutes=${calendarReminderMinutes}`, '_blank');
    void handleRemind(true);
  };

  const handleRemind = async (silent = false) => {
    const token = getToken();
    if (!token) { if (!silent) router.push('/login'); return; }
    setRemindLoading(true);
    if (!silent) setRemindMsg(null);
    try {
      const res = await fetch(`/api/events/${slug}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reminderMinutes: calendarReminderMinutes }),
      });
      const data = await res.json();
      if (!silent) setRemindMsg(data.message);
      if (data?.success) {
        window.dispatchEvent(new CustomEvent('notifications-change'));
      }
      if (!silent) setTimeout(() => setRemindMsg(null), 4000);
    } catch {
      if (!silent) setRemindMsg('Failed to set reminder. Try again.');
    } finally {
      setRemindLoading(false);
    }
  };

  const handleGenerateRecap = async () => {
    const token = getToken();
    if (!token || !event) return;
    setRecapLoading(true);
    setRecapOpen(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/recap`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRecapData(data.data);
      else setRecapData({ error: data.message });
    } catch {
      setRecapData({ error: 'Failed to generate recap.' });
    } finally {
      setRecapLoading(false);
    }
  };

  const handleSendEmergencyAlert = async () => {
    const token = getToken();
    if (!token || !event) return;
    if (!alertTitle || !alertMessage) {
      setAlertError('Title and message are required');
      return;
    }
    setAlertLoading(true);
    setAlertError(null);
    setAlertSuccess(null);
    try {
      const res = await fetch(`/api/events/${event.slug}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: alertTitle,
          message: alertMessage,
          alertType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertSuccess(data.message);
        setAlertTitle('');
        setAlertMessage('');
        setAlertType('other');
        setTimeout(() => setAlertOpen(false), 2000);
      } else {
        setAlertError(data.message || 'Failed to send alert');
      }
    } catch {
      setAlertError('Network error. Please try again.');
    } finally {
      setAlertLoading(false);
    }
  };

  const handleRSVP = async (status: 'going' | 'interested' | 'declined') => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    // If clicking the same status, treat as a cancel (set to declined)
    const newStatus = rsvp.status === status ? 'declined' : status;

    setRsvpLoading(true);
    setRsvpError(null);
    setRsvpSuccess(null);

    try {
      const res = await fetch(`/api/events/${slug}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!data.success) {
        setRsvpError(data.message || 'Failed to update RSVP');
        return;
      }

      setRsvp({
        status: data.data.status,
        onWaitlist: data.data.onWaitlist ?? false,
        waitlistPosition: data.data.waitlistPosition ?? null,
      });
      setRsvpSuccess(data.message);
      if (newStatus === 'going' || newStatus === 'interested') {
        // Auto-register reminder using currently selected lead time.
        void handleRemind(true);
      }

      // Refresh event counts
      const evRes = await fetch(`/api/events/${slug}`);
      const evData = await evRes.json();
      if (evData.success) {
        setEvent(evData.data);
      }
    } catch (err) {
      setRsvpError('Network error. Please try again.');
      console.error('RSVP error:', err);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!event) return;
    const trimmedNote = noteDraft.trim();

    setNoteError(null);
    setNoteSuccess(null);

    if (!trimmedNote) {
      setNoteError('Note cannot be empty.');
      return;
    }

    if (trimmedNote.length > 200) {
      setNoteError('Note cannot exceed 200 characters.');
      return;
    }

    setNoteSaving(true);
    try {
      const response = await fetch(`/api/events/${event.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmedNote }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setNoteError(data?.error || data?.message || 'Failed to save note.');
        return;
      }

      setEvent((prev) => (prev ? { ...prev, notes: data.data?.notes || trimmedNote } : prev));
      setNoteDraft(data.data?.notes || trimmedNote);
      setNoteSuccess('Note saved.');
      setTimeout(() => setNoteSuccess(null), 2000);
    } catch (err) {
      console.error('Note save error:', err);
      setNoteError('Network error. Please try again.');
    } finally {
      setNoteSaving(false);
    }
  };

  const handleClearNote = async () => {
    if (!event) return;

    setNoteSaving(true);
    setNoteError(null);
    setNoteSuccess(null);

    try {
      const response = await fetch(`/api/events/${event.id}/notes`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setNoteError(data?.error || data?.message || 'Failed to clear note.');
        return;
      }

      setEvent((prev) => (prev ? { ...prev, notes: '' } : prev));
      setNoteDraft('');
      setNoteSuccess('Note cleared.');
      setTimeout(() => setNoteSuccess(null), 2000);
    } catch (err) {
      console.error('Note clear error:', err);
      setNoteError('Network error. Please try again.');
    } finally {
      setNoteSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-soft py-12">
        <div className="container-max text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
          <p className="text-neutral-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-neutral-soft py-12">
        <div className="container-max text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <p className="text-neutral-600 mb-6">{error}</p>
          <a href="/events" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition inline-block">
            Browse Events
          </a>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);
  const confirmedSpots = event.goingCount;
  const availableSpots = Math.max(0, event.capacity - confirmedSpots);
  const isFull = availableSpots === 0;
  const fillPercent = Math.min((confirmedSpots / event.capacity) * 100, 100);
  const categoryColor = categoryColors[event.category] || categoryColors.other;

  const isGoing = rsvp.status === 'going' && !rsvp.onWaitlist;
  const isWaitlisted = rsvp.status === 'going' && rsvp.onWaitlist;
  const isInterested = rsvp.status === 'interested';
  const isDeclined = rsvp.status === 'declined';

  return (
    <>
    <div className="min-h-screen bg-neutral-soft py-12">
      <div className="container-max max-w-4xl">
        {/* Back Navigation */}
        <div className="mb-8">
          <a href="/events" className="text-primary hover:text-primary-light font-medium">
            ← Back to Events
          </a>
        </div>

        {/* Hero Image */}
        {event.coverImage ? (
          <div className="w-full h-80 bg-gradient-to-br from-primary-light to-primary rounded-xl overflow-hidden mb-8">
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/40 rounded-xl mb-8 flex items-center justify-center">
            <span className="text-5xl opacity-40">🎉</span>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Title & Category */}
            <div className="mb-6">
              <div className="flex gap-2 mb-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${categoryColor}`}>
                  {event.category}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-3">{event.title}</h1>
              {event.notes && (
                <p className="text-neutral-700 mb-3">
                  📝 {event.notes}
                </p>
              )}
              <p className="text-neutral-600">{event.viewsCount} views · ⭐ {event.averageRating.toFixed(1)}</p>
            </div>

            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold mb-3">Event Note</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  value={noteDraft}
                  onChange={(e) => {
                    setNoteDraft(e.target.value);
                    if (noteError) setNoteError(null);
                  }}
                  placeholder="Write a note for this event..."
                  maxLength={200}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${noteDraft.length > 200 ? 'text-red-600' : 'text-neutral-500'}`}>
                    {noteDraft.length}/200 characters
                  </p>
                  <div className="flex gap-2">
                    {event.notes && (
                      <button
                        onClick={handleClearNote}
                        disabled={noteSaving}
                        className="px-4 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Clear Note
                      </button>
                    )}
                    <button
                      onClick={handleSaveNote}
                      disabled={noteSaving || noteDraft.trim().length === 0 || noteDraft.length > 200}
                      className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-light transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {noteSaving ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>
                {noteError && <p className="text-sm text-red-600">{noteError}</p>}
                {noteSuccess && <p className="text-sm text-green-600">{noteSuccess}</p>}
              </div>
            </Card>

            {/* Schedule & Venue Card */}
            <Card className="p-6 mb-8">
              <div className="grid md:grid-cols-2 gap-6 mb-6 border-b border-neutral-200 pb-6">
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">📅 Start</h3>
                  <p className="text-neutral-700">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-neutral-600">{format(startDate, 'h:mm a')}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">🏁 End</h3>
                  <p className="text-neutral-700">{format(endDate, 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-neutral-600">{format(endDate, 'h:mm a')}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-1">📍 Venue</h3>
                <p className="text-neutral-900 font-medium">{event.venueName}</p>
                <p className="text-neutral-600">{event.venueAddress}</p>
                {event.area && <p className="text-neutral-500 text-sm">Area: {event.area}</p>}
              </div>
            </Card>

            {/* Conflict Warning */}
            {conflicts.length > 0 && (
              <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-amber-800 mb-1">Schedule Conflict Detected</p>
                    <p className="text-amber-700 text-sm mb-2">
                      You're already going to {conflicts.length === 1 ? 'an event' : 'events'} that overlaps with this one:
                    </p>
                    <ul className="space-y-1">
                      {conflicts.map((c) => (
                        <li key={c.id} className="text-sm">
                          <a href={`/events/${c.slug}`} className="font-medium text-amber-900 hover:underline">
                            {c.title}
                          </a>
                          <span className="text-amber-700">
                            {' '}· {format(new Date(c.startDateTime), 'MMM d, h:mm a')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <Card className="p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">About This Event</h2>
              <p className="text-neutral-700 whitespace-pre-wrap leading-relaxed">{event.description}</p>
            </Card>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <Card className="p-6 mb-8">
                <h2 className="text-lg font-bold mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Organizer */}
            {event.organizer && (
              <Card className="p-6 mb-8">
                <h2 className="text-lg font-bold mb-4">Organized By</h2>
                <div className="flex items-center gap-3">
                  {event.organizer.avatarUrl ? (
                    <img
                      src={event.organizer.avatarUrl}
                      alt={event.organizer.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {event.organizer.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{event.organizer.name}</p>
                    <p className="text-sm text-neutral-600">Event Organizer</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Photo Wall Section */}
            {event && (
              <PhotoWallSection
                eventSlug={event.slug}
                eventEnded={new Date(event.endDateTime) < new Date()}
                isAttending={rsvp.status === 'going'}
                isOrganizer={currentUserId === event.organizerId}
              />
            )}

            {/* Reviews Section */}
            {event && (
              <ReviewSection
                eventSlug={event.slug}
                eventTitle={event.title}
                organizerId={event.organizerId || ''}
                isAttending={rsvp.status === 'going'}
                eventEnded={new Date(event.endDateTime) < new Date()}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20">
              {/* Capacity */}
              <div className="mb-6 pb-6 border-b border-neutral-200">
                <h3 className="font-semibold text-neutral-900 mb-2">Availability</h3>
                {isFull ? (
                  <p className="text-lg font-bold text-red-600">Full — Waitlist Open</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-primary">{availableSpots}</p>
                    <p className="text-sm text-neutral-600">of {event.capacity} spots left</p>
                  </>
                )}
                <div className="w-full bg-neutral-100 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="mb-6 pb-6 border-b border-neutral-200 space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Going</span>
                  <span className="font-semibold">{event.goingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Interested</span>
                  <span className="font-semibold">{event.interestedCount}</span>
                </div>
              </div>

              {/* Waitlist badge */}
              {isWaitlisted && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-sm font-semibold text-amber-800">⏳ You're on the waitlist</p>
                  <p className="text-xs text-amber-700">
                    Position #{rsvp.waitlistPosition} — we'll notify you if a spot opens
                  </p>
                </div>
              )}

              {/* Confirmed going badge */}
              {isGoing && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm font-semibold text-green-800">✅ You're going!</p>
                  <p className="text-xs text-green-700">Your spot is confirmed</p>
                </div>
              )}

              {/* RSVP Feedback */}
              {rsvpSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 text-center">{rsvpSuccess}</p>
                </div>
              )}
              {rsvpError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 text-center">{rsvpError}</p>
                </div>
              )}

              {/* RSVP Buttons */}
              <div className="space-y-3">
                <Button
                  id="rsvp-going"
                  onClick={() => handleRSVP('going')}
                  disabled={rsvpLoading}
                  className="w-full"
                  variant={isGoing || isWaitlisted ? 'primary' : 'outline'}
                >
                  {rsvpLoading && rsvp.status !== 'going' ? (
                    '...'
                  ) : isGoing ? (
                    '✓ Going (click to cancel)'
                  ) : isWaitlisted ? (
                    `⏳ Waitlisted #${rsvp.waitlistPosition}`
                  ) : isFull ? (
                    '+ Join Waitlist'
                  ) : (
                    '✓ I\'m Going'
                  )}
                </Button>

                <Button
                  id="rsvp-interested"
                  onClick={() => handleRSVP('interested')}
                  disabled={rsvpLoading}
                  className="w-full"
                  variant={isInterested ? 'primary' : 'outline'}
                >
                  {isInterested ? '♥ Interested (click to cancel)' : '♡ Interested'}
                </Button>

                <Button
                  id="rsvp-declined"
                  onClick={() => handleRSVP('declined')}
                  disabled={rsvpLoading}
                  className="w-full"
                  variant={isDeclined ? 'primary' : 'outline'}
                >
                  {isDeclined ? '✕ Not Going (click to change)' : '✕ Not Going'}
                </Button>
              </div>

              {!isLoggedIn && (
                <p className="text-xs text-center text-neutral-500 mt-3">
                  <a href="/login" className="text-primary hover:underline">Sign in</a> to RSVP
                </p>
              )}

              {/* Calendar + Remind Actions */}
              <div className="mt-5 pt-5 border-t border-neutral-100 space-y-2">
                <div>
                  <label htmlFor="calendar-reminder" className="block text-xs font-medium text-neutral-600 mb-1">
                    Reminder lead time
                  </label>
                  <select
                    id="calendar-reminder"
                    value={calendarReminderMinutes}
                    onChange={(e) => setCalendarReminderMinutes(Number(e.target.value))}
                    className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>
                <button
                  id="add-to-calendar"
                  onClick={handleAddToCalendar}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 px-4 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition text-neutral-700"
                >
                  📅 Add to Calendar (.ics)
                </button>
                {isLoggedIn && (
                  <div className="w-full text-xs text-center text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg py-2 px-3">
                    Reminders are automatic (you’ll get a red alert within 24 hours if you RSVP Going/Interested).
                  </div>
                )}
                {remindMsg && (
                  <p className="text-xs text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3">
                    {remindMsg}
                  </p>
                )}
                {/* Organizer Actions */}
                {event.organizerId && currentUserId === event.organizerId && (
                  <>
                    <button
                      id="generate-recap"
                      onClick={handleGenerateRecap}
                      className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-4 border border-primary/30 text-primary rounded-xl hover:bg-primary/5 transition"
                    >
                      ✨ Generate AI Recap
                    </button>
                    <button
                      id="send-emergency-alert"
                      onClick={() => setAlertOpen(true)}
                      className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-4 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition"
                    >
                      🚨 Send Emergency Alert
                    </button>
                  </>
                )}
              </div>

              {/* QR Share Panel */}
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <h3 className="font-semibold text-neutral-900 mb-3">🔗 Share Event</h3>
                {qrDataUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-inner border border-neutral-100">
                      <img src={qrDataUrl} alt="Event QR Code" className="w-36 h-36" />
                    </div>
                    <div className="flex gap-2 w-full">
                      <button
                        id="copy-event-link"
                        onClick={handleCopyLink}
                        className="flex-1 text-xs font-medium py-2 px-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
                      >
                        {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
                      </button>
                      <a
                        href={qrDataUrl}
                        download={`event-${event.slug}-qr.png`}
                        id="download-event-qr"
                        className="flex-1 text-xs font-medium py-2 px-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition text-center"
                      >
                        ⬇ QR PNG
                      </a>
                    </div>
                    {/* Organizer: show check-in dashboard link */}
                    {event.organizerId && currentUserId === event.organizerId && (
                      <Link
                        href={`/organizer/events/${event.id}/checkin`}
                        id="organizer-checkin-link"
                        className="w-full text-center text-xs font-semibold text-primary border border-primary/30 py-2 px-3 rounded-lg hover:bg-primary/5 transition"
                      >
                        🎫 Open Check-in Dashboard
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      id="copy-event-link"
                      onClick={handleCopyLink}
                      className="flex-1 text-xs font-medium py-2 px-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
                    >
                      {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>

      {/* AI Recap Modal */}
      {recapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-2xl font-bold">✨ AI Event Recap</h2>
                  <p className="text-sm text-neutral-500 mt-1">{event?.title}</p>
                </div>
                <button
                  onClick={() => setRecapOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none ml-4 flex-shrink-0"
                >
                  ×
                </button>
              </div>

              {recapLoading ? (
                <div className="flex flex-col items-center py-12 gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
                  <p className="text-neutral-500">Analyzing event data...</p>
                </div>
              ) : recapData?.error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {recapData.error}
                </div>
              ) : recapData ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <p className="text-neutral-800 leading-relaxed">{recapData.summary}</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Checked In', value: recapData.stats.totalCheckedIn },
                      { label: 'Total Going', value: recapData.stats.totalGoing },
                      { label: 'Attendance', value: `${recapData.stats.attendanceRate}%` },
                      { label: 'Reviews', value: recapData.stats.reviewCount },
                      { label: 'Avg Rating', value: recapData.stats.avgRating ? `${recapData.stats.avgRating.toFixed(1)} ⭐` : 'N/A' },
                      { label: 'Page Views', value: recapData.stats.viewsCount },
                    ].map((s) => (
                      <div key={s.label} className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-primary">{s.value}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Highlights */}
                  {recapData.highlights.length > 0 && (
                    <div>
                      <h3 className="font-bold text-neutral-800 mb-2">🌟 Highlights</h3>
                      <ul className="space-y-2">
                        {recapData.highlights.map((h: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                            <span className="text-primary mt-0.5">•</span>{h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Top Comments */}
                  {recapData.topComments.length > 0 && (
                    <div>
                      <h3 className="font-bold text-neutral-800 mb-2">💬 Attendee Feedback</h3>
                      <div className="space-y-2">
                        {recapData.topComments.map((c: string, i: number) => (
                          <div key={i} className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm text-neutral-700 italic">
                            "{c}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {recapData.suggestions.length > 0 && (
                    <div>
                      <h3 className="font-bold text-neutral-800 mb-2">💡 Suggested Next Steps</h3>
                      <ul className="space-y-2">
                        {recapData.suggestions.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                            <span className="text-amber-500 mt-0.5">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-neutral-400 text-right">
                    Generated {new Date(recapData.generatedAt).toLocaleString()}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Emergency Alert Modal */}
      {alertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-red-600">🚨 Emergency Alert</h2>
                  <p className="text-sm text-neutral-500 mt-1">Send urgent notification to all attendees</p>
                </div>
                <button
                  onClick={() => setAlertOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none ml-4 flex-shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Alert Type */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">Alert Type</label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="other">General Alert</option>
                    <option value="venue_change">Venue Change</option>
                    <option value="weather">Weather Warning</option>
                    <option value="safety">Safety Issue</option>
                    <option value="cancellation">Event Cancelled</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">Title</label>
                  <input
                    type="text"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder="e.g., Venue Changed to New Location"
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">Message</label>
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Describe the urgent situation..."
                    maxLength={1000}
                    rows={4}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <p className="text-xs text-neutral-500 mt-1">{alertMessage.length}/1000 characters</p>
                </div>

                {/* Error */}
                {alertError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{alertError}</p>
                  </div>
                )}

                {/* Success */}
                {alertSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">{alertSuccess}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setAlertOpen(false)}
                    className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg text-neutral-700 font-medium hover:bg-neutral-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmergencyAlert}
                    disabled={alertLoading || !alertTitle || !alertMessage}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {alertLoading ? '⏳ Sending...' : '🚨 Send Alert'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
