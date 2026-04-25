'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  format,
} from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { SessionUser, UserRole } from '@/types';
import { isOrganizer } from '@/lib/permissions';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface CalendarEntry {
  id: string;
  title: string;
  slug: string;
  category: string;
  startDateTime: string;
  endDateTime: string;
  coverImage?: string;
  venueName?: string;
  kind: 'going' | 'interested' | 'organizing' | 'personal';
  notes?: string;
}

const kindStyles: Record<CalendarEntry['kind'], { label: string; dot: string; chip: string }> = {
  going: {
    label: 'Going',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  interested: {
    label: 'Interested',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  organizing: {
    label: 'Organizing',
    dot: 'bg-primary',
    chip: 'bg-primary/10 text-primary border-primary/30',
  },
  personal: {
    label: 'Personal',
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
  },
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createAllDay, setCreateAllDay] = useState(false);
  const [createStart, setCreateStart] = useState(() => toLocalInputValue(new Date()));
  const [createEnd, setCreateEnd] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    try {
      setUser(JSON.parse(userStr) as SessionUser);
    } catch {
      /* ignore */
    }
  }, []);

  const loadEvents = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setFetchError(null);
    try {
      const byId = new Map<string, CalendarEntry>();

      const rsvpRes = await fetch('/api/rsvp/my-events?status=all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rsvpJson = await rsvpRes.json();
      if (rsvpJson.success && rsvpJson.data?.items) {
        for (const row of rsvpJson.data.items as any[]) {
          const st = row.rsvp?.status;
          if (st === 'declined') continue;
          const ev = row.event;
          const kind: CalendarEntry['kind'] = st === 'going' ? 'going' : 'interested';
          byId.set(ev.id, {
            id: ev.id,
            title: ev.title,
            slug: ev.slug,
            category: ev.category,
            startDateTime: ev.startDateTime,
            endDateTime: ev.endDateTime,
            coverImage: ev.coverImage,
            venueName: ev.venueName,
            kind,
          });
        }
      }

      const userStr = localStorage.getItem('user');
      let role: UserRole = 'attendee';
      try {
        if (userStr) role = (JSON.parse(userStr) as SessionUser).role;
      } catch {
        /* ignore */
      }

      if (isOrganizer(role)) {
        const orgRes = await fetch('/api/organizer/events', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orgJson = await orgRes.json();
        if (orgJson.success && orgJson.data?.events) {
          for (const ev of orgJson.data.events as any[]) {
            const id = ev._id?.toString?.() ?? String(ev._id);
            if (byId.has(id)) {
              byId.set(id, { ...byId.get(id)!, kind: 'organizing' });
            } else {
              byId.set(id, {
                id,
                title: ev.title,
                slug: ev.slug,
                category: ev.category,
                startDateTime: ev.startDateTime,
                endDateTime: ev.endDateTime,
                coverImage: ev.coverImage,
                kind: 'organizing',
              });
            }
          }
        }
      }

      // Personal events
      const personalRes = await fetch('/api/calendar/personal', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const personalJson = await personalRes.json();
      if (personalJson.success && personalJson.data?.items) {
        for (const row of personalJson.data.items as any[]) {
          const id = row.id ?? row._id?.toString?.() ?? String(row._id);
          byId.set(`personal:${id}`, {
            id: `personal:${id}`,
            title: row.title,
            slug: '',
            category: 'personal',
            startDateTime: row.startDateTime,
            endDateTime: row.endDateTime,
            venueName: undefined,
            coverImage: undefined,
            kind: 'personal',
            notes: row.notes ?? '',
          });
        }
      }

      setEntries(Array.from(byId.values()));
    } catch {
      setFetchError('Could not load your calendar. Try again.');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadEvents().finally(() => setLoading(false));
  }, [loadEvents]);

  const selectedEvents = useMemo(() => {
    const startKey = format(selectedDay, 'yyyy-MM-dd');
    const out = entries
      .filter((e) => format(new Date(e.startDateTime), 'yyyy-MM-dd') === startKey)
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
    return out;
  }, [entries, selectedDay]);

  const fcEvents = useMemo(() => {
    return entries.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.startDateTime,
      end: e.endDateTime,
      allDay: false,
      classNames: e.kind === 'going'
        ? ['fc-kind-going']
        : e.kind === 'interested'
          ? ['fc-kind-interested']
          : e.kind === 'organizing'
            ? ['fc-kind-organizing']
            : ['fc-kind-personal'],
      extendedProps: e,
    }));
  }, [entries]);

  const submitPersonal = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCreateSaving(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/calendar/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: createTitle,
          notes: createNotes,
          allDay: createAllDay,
          startDateTime: new Date(createStart).toISOString(),
          endDateTime: new Date(createEnd).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateError(data?.message ?? 'Failed to save');
        return;
      }
      window.dispatchEvent(new CustomEvent('notifications-change'));
      setCreateOpen(false);
      setCreateTitle('');
      setCreateNotes('');
      await loadEvents();
    } catch {
      setCreateError('Failed to save. Try again.');
    } finally {
      setCreateSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">My calendar</h1>
          <p className="text-neutral-600">
            Dates with your RSVPs
            {user && isOrganizer(user.role) ? ' and events you organize' : ''}. Click a day to see details.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setSelectedDay(now);
            }}
          >
            Today
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const base = new Date();
              setCreateStart(toLocalInputValue(base));
              setCreateEnd(toLocalInputValue(new Date(base.getTime() + 60 * 60 * 1000)));
              setCreateOpen(true);
            }}
          >
            + Add to my calendar
          </Button>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">{fetchError}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <Card className="p-4 lg:col-span-2 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="calendar-fc">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                height="auto"
                events={fcEvents as any}
                nowIndicator
                navLinks
                dateClick={(info) => {
                  const day = info.date;
                  setSelectedDay(day);
                  const start = new Date(day);
                  start.setMinutes(0, 0, 0);
                  const end = new Date(start.getTime() + 60 * 60 * 1000);
                  setCreateStart(toLocalInputValue(start));
                  setCreateEnd(toLocalInputValue(end));
                  setCreateOpen(true);
                }}
                eventClick={(info) => {
                  const e = info.event.extendedProps as any as CalendarEntry;
                  if (e?.startDateTime) setSelectedDay(new Date(e.startDateTime));
                  if (e?.slug) window.location.href = `/events/${e.slug}`;
                }}
              />
              <style jsx global>{`
                .calendar-fc .fc .fc-toolbar-title {
                  font-size: 1rem;
                  font-weight: 700;
                  color: rgb(23 23 23);
                }
                .calendar-fc .fc .fc-button {
                  border-radius: 0.75rem;
                }
                .calendar-fc .fc-kind-going {
                  background-color: rgba(16, 185, 129, 0.12);
                  border-color: rgba(16, 185, 129, 0.35);
                  color: rgb(4 120 87);
                }
                .calendar-fc .fc-kind-interested {
                  background-color: rgba(245, 158, 11, 0.12);
                  border-color: rgba(245, 158, 11, 0.35);
                  color: rgb(146 64 14);
                }
                .calendar-fc .fc-kind-organizing {
                  background-color: rgba(99, 102, 241, 0.12);
                  border-color: rgba(99, 102, 241, 0.35);
                  color: rgb(67 56 202);
                }
                .calendar-fc .fc-kind-personal {
                  background-color: rgba(14, 165, 233, 0.12);
                  border-color: rgba(14, 165, 233, 0.35);
                  color: rgb(3 105 161);
                }
              `}</style>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:sticky lg:top-24">
          <h2 className="font-bold text-lg mb-1">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</h2>
          <p className="text-sm text-neutral-500 mb-4">
            {selectedEvents.length === 0 ? 'No events on this day.' : `${selectedEvents.length} event(s)`}
          </p>
          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {selectedEvents.map((ev) => {
              const st = kindStyles[ev.kind];
              const start = new Date(ev.startDateTime);
              const end = new Date(ev.endDateTime);
              return (
                <Link
                  key={ev.id}
                  href={ev.slug ? `/events/${ev.slug}` : '#'}
                  className="block rounded-xl border border-neutral-200 p-3 hover:border-primary/40 hover:bg-primary/[0.03] transition"
                  onClick={(e) => {
                    if (!ev.slug) e.preventDefault();
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${st.chip}`}>
                      {st.label}
                    </span>
                    <span className="text-[10px] uppercase text-neutral-500 font-medium ml-auto">
                      {ev.category}
                    </span>
                  </div>
                  <p className="font-semibold text-neutral-900 mt-2 line-clamp-2">{ev.title}</p>
                  <p className="text-xs text-neutral-600 mt-1">
                    {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
                  </p>
                  {ev.venueName && <p className="text-xs text-neutral-500 mt-0.5">{ev.venueName}</p>}
                  {ev.kind === 'personal' && ev.notes && (
                    <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{ev.notes}</p>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Legend</p>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${kindStyles.going.dot}`} />
                Going
              </li>
              <li className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${kindStyles.interested.dot}`} />
                Interested
              </li>
              <li className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${kindStyles.personal.dot}`} />
                Personal
              </li>
              {user && isOrganizer(user.role) && (
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${kindStyles.organizing.dot}`} />
                  Organizing
                </li>
              )}
            </ul>
          </div>
        </Card>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => (createSaving ? null : setCreateOpen(false))}
            aria-label="Close"
          />
          <Card className="relative w-full max-w-lg p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold">Add to my calendar</h3>
                <p className="text-sm text-neutral-500">This creates a personal calendar entry (only you can see it).</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={createSaving}>
                ✕
              </Button>
            </div>

            {createError && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                {createError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-600">Title</label>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g., Study group, Meeting, Birthday"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Start</label>
                  <input
                    type="datetime-local"
                    value={createStart}
                    onChange={(e) => setCreateStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600">End</label>
                  <input
                    type="datetime-local"
                    value={createEnd}
                    onChange={(e) => setCreateEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={createAllDay}
                  onChange={(e) => setCreateAllDay(e.target.checked)}
                />
                All day
              </label>

              <div>
                <label className="text-xs font-semibold text-neutral-600">Notes (optional)</label>
                <textarea
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="mt-1 w-full min-h-[90px] rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Any details you want to remember…"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSaving}>
                  Cancel
                </Button>
                <Button onClick={submitPersonal} disabled={createSaving || !createTitle.trim()}>
                  {createSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
