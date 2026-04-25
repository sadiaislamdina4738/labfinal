'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { SessionUser } from '@/types';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');
  const isHomePage = pathname === '/';

  useEffect(() => {
    const loadUser = () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (userStr && token) {
        try {
          const currentUser = JSON.parse(userStr) as SessionUser;
          setUser(currentUser);
        } catch {
          // ignore
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    loadUser();

    const handleAuthChange = () => {
      loadUser();
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/notifications?page=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.data.unreadCount ?? 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [loading, user, fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      fetchUnreadCount();
    };
    window.addEventListener('notifications-change', handler as any);
    return () => window.removeEventListener('notifications-change', handler as any);
  }, [user, fetchUnreadCount]);

  if (isAuthPage) return null;
  if (loading) return null;

  // Homepage navbar for unauthenticated users
  if (!user && isHomePage) {
    return (
      <nav className="sticky top-0 z-50 bg-white border-b border-neutral-100 backdrop-blur-sm bg-opacity-95">
        <div className="container-max flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-gradient">
            EventEase
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#" className="text-neutral-600 hover:text-neutral-900 transition">
              Home
            </a>
            <a href="/events" className="text-neutral-600 hover:text-neutral-900 transition">
              Explore Events
            </a>
            <a href="#features" className="text-neutral-600 hover:text-neutral-900 transition">
              Features
            </a>
            <a href="#faq" className="text-neutral-600 hover:text-neutral-900 transition">
              Organizers
            </a>
          </div>
          <Link
            href="/register"
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition inline-block"
          >
            Get Started
          </Link>
        </div>
      </nav>
    );
  }

  // Dashboard navbar for authenticated users
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-neutral-100 shadow-sm">
      <div className="container-max flex justify-between items-center h-16">
        <Link href={user ? '/dashboard' : '/'} className="text-2xl font-bold text-gradient">
          EventEase
        </Link>

        <div className="flex items-center gap-4">
          {!user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm px-4 py-2 text-neutral-700 hover:text-primary transition font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
              >
                Get Started
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/calendar"
                id="nav-calendar"
                className="hidden sm:inline-flex text-sm px-3 py-1.5 rounded-lg text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition font-medium"
                title="My calendar"
              >
                Calendar
              </Link>
              <Link
                href="/notifications"
                id="nav-notifications"
                className="relative p-2 rounded-lg hover:bg-neutral-100 transition text-neutral-600 hover:text-neutral-900"
                title="Notifications"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <span className="text-sm text-neutral-500 hidden sm:block">|</span>

              <span className="text-sm text-neutral-700 hidden sm:block font-medium">
                {user.name}
              </span>

              <Link
                href="/profile"
                className="text-sm px-3 py-1.5 text-primary border border-primary/30 hover:bg-primary/5 rounded-lg transition font-medium"
              >
                Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
