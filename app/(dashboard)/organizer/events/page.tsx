'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import Link from 'next/link';

interface OrganizerEvent {
  _id: string;
  title: string;
  slug: string;
  startDateTime: string;
  endDateTime: string;
  category: string;
  status: string;
  goingCount: number;
  capacity: number;
}

interface AnnouncementModal {
  eventId: string;
  eventTitle: string;
  slug: string;
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<AnnouncementModal | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/organizer/events', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      if (data.success) {
        setEvents(data.data.events);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizer/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setEvents(events.filter((e) => e._id !== id));
      } else {
        setError('Failed to delete event');
      }
    } catch {
      setError('Error deleting event');
    }
  }

  async function sendAnnouncement() {
    if (!modal || !announcementMessage.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch(`/api/events/${modal.slug}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: announcementTitle.trim() || `Announcement: ${modal.eventTitle}`,
          message: announcementMessage.trim(),
        }),
      });

      const data = await res.json();
      setSendResult({ ok: data.success, msg: data.message });

      if (data.success) {
        setAnnouncementTitle('');
        setAnnouncementMessage('');
        setTimeout(() => {
          setModal(null);
          setSendResult(null);
        }, 2000);
      }
    } catch {
      setSendResult({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setSending(false);
    }
  }

  const statusColors: Record<string, string> = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-neutral-100 text-neutral-600',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Events</h1>
          <p className="text-neutral-600">Manage your events and send announcements</p>
        </div>
        <Link href="/organizer/events/new">
          <Button>+ Create Event</Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <Card className="p-16 text-center">
          <p className="text-4xl mb-4">🎪</p>
          <p className="text-neutral-600 mb-4 text-lg">You haven't created any events yet</p>
          <Link href="/organizer/events/new">
            <Button>Create Your First Event</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const fillPct = Math.min((event.goingCount / event.capacity) * 100, 100);
            const isPast = new Date(event.endDateTime) < new Date();
            return (
              <Card key={event._id} className="p-6 hover:shadow-md transition">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[event.status] ?? 'bg-neutral-100 text-neutral-600'}`}
                      >
                        {event.status}
                      </span>
                      {isPast && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-500">
                          Past
                        </span>
                      )}
                      <span className="text-xs text-neutral-500 capitalize">{event.category}</span>
                    </div>

                    <Link href={`/events/${event.slug}`}>
                      <h3 className="text-lg font-bold hover:text-primary transition mb-1 truncate">
                        {event.title}
                      </h3>
                    </Link>

                    <div className="flex gap-4 text-sm text-neutral-600 mb-3">
                      <span>📅 {format(new Date(event.startDateTime), 'MMM d, yyyy · h:mm a')}</span>
                    </div>

                    {/* Capacity bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[180px]">
                        <div className="w-full bg-neutral-100 rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-neutral-500">
                        {event.goingCount}/{event.capacity} going
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setModal({ eventId: event._id, eventTitle: event.title, slug: event.slug });
                        setAnnouncementTitle('');
                        setAnnouncementMessage('');
                        setSendResult(null);
                      }}
                    >
                      📣 Announce
                    </Button>
                    <Link href={`/organizer/events/${event._id}/checkin`}>
                      <Button variant="outline" size="sm">
                        🎫 Check-in
                      </Button>
                    </Link>
                    <Link href={`/organizer/events/${event._id}/edit`}>
                      <Button variant="outline" size="sm">
                        ✏️ Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event._id)}
                      className="text-red-600 hover:bg-red-50 border-red-200"
                    >
                      🗑 Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Announcement Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">📣 Send Announcement</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  All attendees &amp; interested users of <span className="font-medium text-neutral-700">{modal.eventTitle}</span> will be notified
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none ml-4"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Title <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  type="text"
                  id="announcement-title"
                  placeholder={`Announcement: ${modal.eventTitle}`}
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="announcement-message"
                  placeholder="Write your announcement here..."
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <p className="text-xs text-neutral-400 text-right mt-1">
                  {announcementMessage.length}/500
                </p>
              </div>

              {sendResult && (
                <div
                  className={`p-3 rounded-lg text-sm text-center ${
                    sendResult.ok
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {sendResult.ok ? '✅ ' : '❌ '}{sendResult.msg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setModal(null)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={sendAnnouncement}
                  disabled={sending || !announcementMessage.trim()}
                >
                  {sending ? 'Sending...' : 'Send Announcement'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
