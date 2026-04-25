'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import type { SessionUser } from '@/types';

export default function OrganizerDashboardHome() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, upcoming: 0 });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) { router.push('/login'); return; }
    try {
      const u = JSON.parse(userStr) as SessionUser;
      if (u.role !== 'organizer' && u.role !== 'admin') {
        router.push(`/dashboard/${u.role}`);
        return;
      }
      setUser(u);
      // Fetch quick stats
      fetch('/api/organizer/events', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            const events = data.data.events as any[];
            const now = new Date();
            setStats({
              total: events.length,
              published: events.filter((e: any) => e.status === 'published').length,
              upcoming: events.filter((e: any) => new Date(e.startDateTime) > now).length,
            });
          }
        })
        .catch(() => {});
    } catch { router.push('/login'); }
    finally { setLoading(false); }
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"/></div>
  );
  if (!user) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Organizer Hub 🎪</h1>
          <p className="text-neutral-600">Welcome back, {user.name}. Manage your events and connect with attendees.</p>
        </div>
        <Link href="/organizer/events/new">
          <Button>+ Create New Event</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <p className="text-4xl font-bold text-primary">{stats.total}</p>
          <p className="text-sm text-neutral-600 mt-1">Total Events</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-4xl font-bold text-green-600">{stats.published}</p>
          <p className="text-sm text-neutral-600 mt-1">Published</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-4xl font-bold text-blue-600">{stats.upcoming}</p>
          <p className="text-sm text-neutral-600 mt-1">Upcoming</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'My Calendar', desc: 'Month view of RSVPs and events you organize', href: '/calendar', icon: '📅' },
          { title: 'My Events', desc: 'View, edit, and manage all your events', href: '/organizer/events', icon: '📋' },
          { title: 'Create Event', desc: 'Start planning your next event now', href: '/organizer/events/new', icon: '➕' },
          { title: 'Check-in Dashboard', desc: 'Manage attendee check-ins with QR', href: '/organizer/events', icon: '🎫' },
          { title: 'Venue Planner', desc: 'Design your event layout & budget', href: '/organizer/venue-planner', icon: '🎨' },
          { title: 'Notifications', desc: 'View RSVP alerts and announcements', href: '/notifications', icon: '🔔' },
          { title: 'My Profile', desc: 'Update your organizer profile', href: '/profile', icon: '👤' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="font-bold mb-1">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
