'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import type { SessionUser } from '@/types';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ events: '—', users: '—', rsvps: '—' });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) { router.push('/login'); return; }
    try {
      const u = JSON.parse(userStr) as SessionUser;
      if (u.role !== 'admin') {
        router.push(`/dashboard/${u.role}`);
        return;
      }
      setUser(u);
      // Fetch platform stats
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.success) setStats(data.data);
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
      <div>
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard 🛡️</h1>
        <p className="text-neutral-600">Platform management and oversight — welcome, {user.name}.</p>
      </div>

      {/* Platform Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <p className="text-4xl font-bold text-primary">{stats.events}</p>
          <p className="text-sm text-neutral-600 mt-1">Total Events</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-4xl font-bold text-blue-600">{stats.users}</p>
          <p className="text-sm text-neutral-600 mt-1">Registered Users</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-4xl font-bold text-green-600">{stats.rsvps}</p>
          <p className="text-sm text-neutral-600 mt-1">Total RSVPs</p>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'All Events', desc: 'Browse and moderate all platform events', href: '/events', icon: '📋' },
          { title: 'My Profile', desc: 'Manage admin account settings', href: '/profile', icon: '👤' },
          { title: 'Notifications', desc: 'Review platform alerts and reports', href: '/notifications', icon: '🔔' },
          { title: 'Create Event', desc: 'Create events as admin', href: '/organizer/events/new', icon: '➕' },
          { title: 'Check-in', desc: 'Access any event check-in dashboard', href: '/organizer/events', icon: '🎫' },
          { title: 'Platform', desc: 'More admin tools coming soon', href: '#', icon: '⚙️' },
        ].map((item) => (
          <Link key={item.title} href={item.href}>
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
