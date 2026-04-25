'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  eventId?: string | null;
  eventSlug?: string | null;
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const typeIcons: Record<string, string> = {
  event_reminder: '⏰',
  event_update: '📝',
  rsvp_response: '🎉',
  new_review: '⭐',
  photo_approved: '📸',
  announcement: '📣',
  check_in_opened: '✅',
  emergency_alert: '🚨',
};

const priorityStyles: Record<string, { card: string; badge: string }> = {
  low: { card: 'border-red-200 bg-red-50/50', badge: 'bg-red-100 text-red-700' },
  medium: { card: 'border-red-200 bg-red-50/50', badge: 'bg-red-100 text-red-700' },
  high: { card: 'border-red-200 bg-red-50/50', badge: 'bg-red-100 text-red-700' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const getToken = () => localStorage.getItem('token');

  const fetchNotifications = useCallback(async (page: number) => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/notifications?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [currentPage, fetchNotifications]);

  const markSingleRead = async (id: string) => {
    const token = getToken();
    if (!token) return;

    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      window.dispatchEvent(new CustomEvent('notifications-change'));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const markAllAsRead = async () => {
    const token = getToken();
    if (!token) return;
    setMarkingAll(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        window.dispatchEvent(new CustomEvent('notifications-change'));
      }
    } catch (error) {
      console.error('Failed to mark all read:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2">Notifications</h1>
          <p className="text-neutral-600">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" disabled={markingAll}>
            {markingAll ? 'Marking...' : '✓ Mark All Read'}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-16 text-center">
          <p className="text-5xl mb-4">🔔</p>
          <p className="text-lg font-medium mb-2">No notifications yet</p>
          <p className="text-neutral-500 text-sm">
            You'll see event reminders, announcements, and updates here
          </p>
        </Card>
      ) : (
        <>
          {/* Unread section */}
          {unread.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                Unread ({unread.length})
              </h2>
              <div className="space-y-3">
                {unread.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notif={notif}
                    onMarkRead={markSingleRead}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Read section */}
          {read.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                Earlier
              </h2>
              <div className="space-y-3">
                {read.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notif={notif}
                    onMarkRead={markSingleRead}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                ← Prev
              </Button>
              <span className="flex items-center px-4 text-sm text-neutral-600">
                Page {currentPage} of {pagination.pages}
              </span>
              <Button
                onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
                variant="outline"
              >
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NotificationCard({
  notif,
  onMarkRead,
}: {
  notif: Notification;
  onMarkRead: (id: string) => void;
}) {
  const icon = typeIcons[notif.type] ?? '🔔';
  const style = priorityStyles[notif.priority] ?? priorityStyles.medium;

  return (
    <div
      className={`flex gap-4 p-4 border rounded-xl transition-all ${
        notif.read ? 'bg-white border-neutral-200 opacity-75' : (style?.card ?? 'bg-amber-50/50 border-amber-200') + ' shadow-sm'
      }`}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-lg shadow-sm">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-neutral-900 text-sm">{notif.title}</h3>
            {!notif.read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style?.badge ?? 'bg-amber-100 text-amber-700'}`}>
              {notif.priority}
            </span>
          </div>
          <span className="text-xs text-neutral-400 flex-shrink-0">
            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
          </span>
        </div>

        <p className="text-sm text-neutral-700 mb-2 leading-relaxed">{notif.message}</p>

        <div className="flex items-center gap-3">
          {notif.eventSlug && (
            <Link
              href={`/events/${notif.eventSlug}`}
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => !notif.read && onMarkRead(notif.id)}
            >
              View Event →
            </Link>
          )}
          {!notif.read && (
            <button
              onClick={() => onMarkRead(notif.id)}
              className="text-xs text-neutral-400 hover:text-neutral-600 transition"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
