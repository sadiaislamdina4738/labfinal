'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import Link from 'next/link';
import QRCode from 'qrcode';

interface Attendee {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  checkedIn: boolean;
}

interface RecentCheckIn {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  checkedInAt: string;
  source: 'qr' | 'manual';
}

interface Stats {
  eventTitle: string;
  totalGoing: number;
  checkedInCount: number;
  recentCheckIns: RecentCheckIn[];
}

export default function CheckinDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [stats, setStats] = useState<Stats | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkinFeedback, setCheckinFeedback] = useState<{ userId: string; ok: boolean; msg: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [eventQrToken, setEventQrToken] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const fetchStats = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/checkin?eventId=${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.message || 'Failed to load check-in data');
      }
    } catch {
      setError('Network error fetching stats');
    } finally {
      setStatsLoading(false);
    }
  }, [eventId]);

  const fetchAttendees = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/checkin/attendees?eventId=${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAttendees(data.data.attendees);
      }
    } catch {
      // silently fail
    }
  }, [eventId]);

  // Fetch event info (for qrToken)
  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    const userStr = localStorage.getItem('user');
    if (!userStr) { router.push('/login'); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'organizer' && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // We need the event's qrToken — fetch from organizer events API
    fetch(`/api/organizer/events`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (data.success) {
          const ev = data.data.events.find((e: any) => e._id === eventId);
          if (ev?.qrToken) {
            setEventQrToken(ev.qrToken);
            const qrUrl = `${window.location.origin}/events/checkin?token=${ev.qrToken}&event=${eventId}`;
            const dataUrl = await QRCode.toDataURL(qrUrl, {
              width: 256,
              margin: 2,
              color: { dark: '#1a1a2e', light: '#ffffff' },
            });
            setQrDataUrl(dataUrl);
          }
        }
      })
      .catch(() => {});

    Promise.all([fetchStats(), fetchAttendees()]).finally(() => setLoading(false));
  }, [eventId, router, fetchStats, fetchAttendees]);

  // Poll every 10 seconds for live updates
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchStats();
      fetchAttendees();
    }, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStats, fetchAttendees]);

  const handleManualCheckin = async (userId: string) => {
    const token = getToken();
    if (!token) return;
    setCheckingIn(userId);
    setCheckinFeedback(null);
    try {
      const res = await fetch('/api/checkin/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, eventId }),
      });
      const data = await res.json();
      setCheckinFeedback({ userId, ok: data.success, msg: data.message });
      if (data.success) {
        // Update local state immediately
        setAttendees((prev) =>
          prev.map((a) => (a.userId === userId ? { ...a, checkedIn: true } : a))
        );
        fetchStats();
        setTimeout(() => setCheckinFeedback(null), 3000);
      }
    } catch {
      setCheckinFeedback({ userId, ok: false, msg: 'Network error' });
    } finally {
      setCheckingIn(null);
    }
  };

  const filteredAttendees = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const checkedInPct =
    stats && stats.totalGoing > 0
      ? Math.round((stats.checkedInCount / stats.totalGoing) * 100)
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-soft">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800">{error}</div>
        <Link href="/organizer/events">
          <Button variant="outline">← Back to Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/organizer/events"
            className="text-sm text-primary hover:text-primary-light font-medium mb-2 inline-block"
          >
            ← Back to Events
          </Link>
          <h1 className="text-3xl font-bold">
            🎫 Check-in Dashboard
          </h1>
          {stats && (
            <p className="text-neutral-600 mt-1 font-medium">{stats.eventTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchStats(); fetchAttendees(); }}
            className="text-sm text-primary hover:text-primary-light font-medium px-4 py-2 rounded-lg border border-primary/30 hover:bg-primary/5 transition"
          >
            🔄 Refresh
          </button>
          {statsLoading && (
            <span className="text-xs text-neutral-400 animate-pulse">Updating...</span>
          )}
        </div>
      </div>

      {/* Live Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <p className="text-5xl font-bold text-primary mb-1">{stats.checkedInCount}</p>
            <p className="text-sm text-neutral-600 font-medium">Checked In</p>
          </Card>
          <Card className="p-6 text-center">
            <p className="text-5xl font-bold text-neutral-800 mb-1">{stats.totalGoing}</p>
            <p className="text-sm text-neutral-600 font-medium">Confirmed Going</p>
          </Card>
          <Card className="p-6 text-center">
            <p className="text-5xl font-bold text-emerald-600 mb-1">{checkedInPct}%</p>
            <p className="text-sm text-neutral-600 font-medium">Attendance Rate</p>
            <div className="w-full bg-neutral-100 rounded-full h-2 mt-3">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${checkedInPct}%` }}
              />
            </div>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: QR Code + Manual Check-in */}
        <div className="space-y-6">
          {/* QR Display */}
          {qrDataUrl && (
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">📷 Event QR Code</h2>
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-inner border border-neutral-100">
                  <img src={qrDataUrl} alt="Event QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-neutral-500 text-center">
                  Display this QR code at the event entrance for attendee self-check-in
                </p>
                <a
                  href={qrDataUrl}
                  download={`event-${eventId}-qr.png`}
                  id="download-qr-btn"
                  className="text-sm text-primary hover:text-primary-light font-medium border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/5 transition"
                >
                  ⬇ Download QR PNG
                </a>
              </div>
            </Card>
          )}

          {/* Manual Attendee Check-in */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">👤 Manual Check-in</h2>
            <input
              id="attendee-search"
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            {filteredAttendees.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <p className="text-2xl mb-2">👥</p>
                <p className="text-sm">
                  {search ? 'No attendees match your search' : 'No confirmed attendees yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredAttendees.map((attendee) => (
                  <div
                    key={attendee.userId}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      attendee.checkedIn
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-neutral-200 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {attendee.avatarUrl ? (
                        <img
                          src={attendee.avatarUrl}
                          alt={attendee.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {attendee.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{attendee.name}</p>
                        <p className="text-xs text-neutral-500">{attendee.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {checkinFeedback?.userId === attendee.userId && (
                        <span
                          className={`text-xs font-medium ${
                            checkinFeedback.ok ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {checkinFeedback.ok ? '✓' : '✗'}
                        </span>
                      )}
                      {attendee.checkedIn ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                          ✓ Done
                        </span>
                      ) : (
                        <button
                          id={`checkin-${attendee.userId}`}
                          onClick={() => handleManualCheckin(attendee.userId)}
                          disabled={checkingIn === attendee.userId}
                          className="text-xs font-semibold text-white bg-primary hover:bg-primary-light px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          {checkingIn === attendee.userId ? '...' : 'Check In'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Live Activity Feed */}
        <div>
          <Card className="p-6 h-full">
            <h2 className="text-lg font-bold mb-4">⚡ Live Activity</h2>
            {!stats || stats.recentCheckIns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-neutral-400">
                <p className="text-3xl mb-3">🚪</p>
                <p className="text-sm">No check-ins yet</p>
                <p className="text-xs mt-1">Activity will appear here in real time</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {stats.recentCheckIns.map((ci) => (
                  <div
                    key={ci.id}
                    className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100 hover:border-neutral-200 transition"
                  >
                    {ci.avatarUrl ? (
                      <img
                        src={ci.avatarUrl}
                        alt={ci.userName}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {ci.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{ci.userName}</p>
                      <p className="text-xs text-neutral-500">
                        {format(new Date(ci.checkedInAt), 'h:mm a')} · {ci.source === 'qr' ? '📷 QR' : '✋ Manual'}
                      </p>
                    </div>
                    <span className="text-emerald-500 text-lg flex-shrink-0">✓</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
