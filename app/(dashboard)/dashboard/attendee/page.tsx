'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { RecommendationsSection } from '@/components/sections/RecommendationsSection';
import Link from 'next/link';
import type { SessionUser } from '@/types';

interface ActivityStats {
  attending: number;
  interested: number;
  attended: number;
}

export default function AttendeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ActivityStats>({ attending: 0, interested: 0, attended: 0 });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) { router.push('/login'); return; }
    try {
      const u = JSON.parse(userStr) as SessionUser;
      if (u.role !== 'attendee') {
        router.push(`/dashboard/${u.role}`);
        return;
      }
      setUser(u);

      // Fetch RSVP stats
      fetch('/api/rsvp/my-events', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data?.items) {
            const items = data.data.items;
            const now = new Date();
            const attending = items.filter((i: any) => i.rsvp.status === 'going' && new Date(i.event.startDateTime) >= now).length;
            const interested = items.filter((i: any) => i.rsvp.status === 'interested' && new Date(i.event.startDateTime) >= now).length;
            const attended = items.filter((i: any) => new Date(i.event.startDateTime) < now).length;
            setStats({ attending, interested, attended });
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

  const quickLinks = [
    { title: 'Browse Events', description: 'Discover upcoming events near you', href: '/events', icon: '🔍', color: 'from-blue-50 to-blue-100 border-blue-200' },
    { title: 'My Calendar', description: 'See your events on a month view', href: '/calendar', icon: '📅', color: 'from-rose-50 to-rose-100 border-rose-200' },
    { title: 'My Events', description: 'View events you\'re attending or interested in', href: '/dashboard/my-events', icon: '🎟️', color: 'from-purple-50 to-purple-100 border-purple-200' },
    { title: 'Notifications', description: 'Stay up to date with event updates', href: '/notifications', icon: '🔔', color: 'from-amber-50 to-amber-100 border-amber-200' },
    { title: 'My Profile', description: 'Update your interests and preferences', href: '/profile', icon: '👤', color: 'from-green-50 to-green-100 border-green-200' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Welcome back, {user.name}! 🎉</h1>
        <p className="text-neutral-600">Discover events, manage your RSVPs, and stay connected.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className={`p-6 border bg-gradient-to-br ${link.color} hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full`}>
              <div className="text-3xl mb-3">{link.icon}</div>
              <h3 className="font-bold text-neutral-900 mb-1">{link.title}</h3>
              <p className="text-sm text-neutral-600">{link.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">📅 Your Activity</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-3xl font-bold text-blue-600">{stats.attending}</p>
            <p className="text-sm text-neutral-600 mt-1">Events Attending</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-3xl font-bold text-purple-600">{stats.interested}</p>
            <p className="text-sm text-neutral-600 mt-1">Interested In</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-3xl font-bold text-green-600">{stats.attended}</p>
            <p className="text-sm text-neutral-600 mt-1">Events Attended</p>
          </div>
        </div>
        <p className="text-sm text-neutral-500 mt-4 text-center">
          <Link href="/dashboard/my-events" className="text-primary hover:underline">View all your events →</Link>
        </p>
      </Card>

      <RecommendationsSection title="Recommended Events for You" limit={4} />
    </div>
  );
}
