'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import type { SessionUser } from '@/types';

export default function VendorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) { router.push('/login'); return; }
    try {
      const u = JSON.parse(userStr) as SessionUser;
      if (u.role !== 'vendor' && u.role !== 'admin') {
        router.push(`/dashboard/${u.role}`);
        return;
      }
      setUser(u);
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
        <h1 className="text-4xl font-bold mb-2">Vendor Portal 🏪</h1>
        <p className="text-neutral-600">Welcome, {user.name}. Manage your vendor profile and event connections.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/events">
          <Card className="p-6 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-bold mb-1">Browse Events</h3>
            <p className="text-sm text-neutral-600">Discover events where you can offer your services</p>
          </Card>
        </Link>
        <Link href="/profile">
          <Card className="p-6 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
            <div className="text-3xl mb-3">👤</div>
            <h3 className="font-bold mb-1">My Profile</h3>
            <p className="text-sm text-neutral-600">Update your vendor profile and preferences</p>
          </Card>
        </Link>
        <Link href="/notifications">
          <Card className="p-6 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
            <div className="text-3xl mb-3">🔔</div>
            <h3 className="font-bold mb-1">Notifications</h3>
            <p className="text-sm text-neutral-600">Stay updated on event opportunities</p>
          </Card>
        </Link>
        <Card className="p-6 bg-neutral-50">
          <div className="text-3xl mb-3">🚀</div>
          <h3 className="font-bold mb-1">Coming Soon</h3>
          <p className="text-sm text-neutral-600">Vendor marketplace features are in development</p>
        </Card>
      </div>
    </div>
  );
}
