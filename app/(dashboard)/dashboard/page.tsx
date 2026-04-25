'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.replace('/login');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      const role: UserRole = user.role;
      const roleRoutes: Record<UserRole, string> = {
        attendee: '/dashboard/attendee',
        organizer: '/dashboard/organizer',
        vendor: '/dashboard/vendor',
        admin: '/dashboard/admin',
      };
      router.replace(roleRoutes[role] ?? '/dashboard/attendee');
    } catch {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-soft">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
    </div>
  );
}
