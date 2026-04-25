'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { IUser } from '@/types';

const ALL_INTERESTS = [
  'tech', 'music', 'sports', 'arts', 'food', 'business', 'education', 'community', 'other',
];

interface NotifPrefs {
  emailReminders: boolean;
  pushNotifications: boolean;
  eventUpdates: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Partial<IUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<IUser>>({});
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    emailReminders: true,
    pushNotifications: true,
    eventUpdates: true,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) router.push('/login');
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setUser(data.data);
      setFormData(data.data);
      setSelectedInterests(data.data.interests ?? []);
      setNotifPrefs(
        data.data.notificationPreferences ?? {
          emailReminders: true,
          pushNotifications: true,
          eventUpdates: true,
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save profile');

      const data = await response.json();
      setUser(data.data);
      setEditing(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePrefs() {
    setSavingPrefs(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationPreferences: notifPrefs }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      const data = await response.json();
      setUser(data.data);
      setSuccess('Notification preferences saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleSaveInterests() {
    setSavingInterests(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ interests: selectedInterests }),
      });
      if (!response.ok) throw new Error('Failed to save interests');
      const data = await response.json();
      setUser(data.data);
      setSuccess('Interests saved!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingInterests(false);
    }
  }

  async function handleLogout() {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Dispatch event to notify other components (e.g., Navbar)
      window.dispatchEvent(new Event('auth-change'));
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-12 text-neutral-600">User not found</div>;
  }

  const roleColors: Record<string, string> = {
    attendee: 'bg-blue-100 text-blue-800',
    organizer: 'bg-purple-100 text-purple-800',
    admin: 'bg-red-100 text-red-800',
    vendor: 'bg-green-100 text-green-800',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Profile</h1>
        <p className="text-neutral-600">Manage your account settings and preferences</p>
      </div>

      {/* Feedback */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
          ✅ {success}
        </div>
      )}

      {/* Profile Info Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-neutral-500">{user.email}</p>
              <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[user.role ?? 'attendee'] ?? 'bg-neutral-100'}`}>
                {user.role}
              </span>
            </div>
          </div>
          <Button
            onClick={() => {
              if (editing) setFormData(user);
              setEditing(!editing);
            }}
            variant={editing ? 'outline' : 'primary'}
            size="sm"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
            {editing ? (
              <Input
                id="profile-name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            ) : (
              <p className="text-neutral-900">{user.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <p className="text-neutral-500">{user.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Role</label>
            <p className="text-neutral-900 capitalize">{user.role}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Bio</label>
            {editing ? (
              <textarea
                id="profile-bio"
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                maxLength={500}
                placeholder="Tell others about yourself..."
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            ) : (
              <p className="text-neutral-600">{user.bio || <span className="italic text-neutral-400">No bio added yet</span>}</p>
            )}
          </div>

          {editing && (
            <Button
              id="profile-save"
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-2"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </Card>

      {/* Interests Card */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-1">Your Interests</h2>
        <p className="text-sm text-neutral-500 mb-5">
          Select categories you enjoy — we'll use these to personalize your experience
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {ALL_INTERESTS.map((interest) => {
            const selected = selectedInterests.includes(interest);
            return (
              <button
                key={interest}
                id={`interest-${interest}`}
                onClick={() =>
                  setSelectedInterests((prev) =>
                    selected ? prev.filter((i) => i !== interest) : [...prev, interest]
                  )
                }
                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize border transition ${
                  selected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary/50 hover:text-primary'
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
        <Button
          id="save-interests"
          onClick={handleSaveInterests}
          disabled={savingInterests}
          variant="outline"
          className="w-full"
        >
          {savingInterests ? 'Saving...' : 'Save Interests'}
        </Button>
      </Card>

      {/* Notification Preferences Card */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-1">Notification Preferences</h2>
        <p className="text-sm text-neutral-500 mb-5">
          Choose what you'd like to be notified about
        </p>

        <div className="space-y-4">
          {[
            {
              key: 'emailReminders' as keyof NotifPrefs,
              label: '📧 Email Reminders',
              desc: 'Receive email reminders before events you\'re attending',
            },
            {
              key: 'pushNotifications' as keyof NotifPrefs,
              label: '🔔 In-App Notifications',
              desc: 'Get notified about event updates, announcements, and changes',
            },
            {
              key: 'eventUpdates' as keyof NotifPrefs,
              label: '📝 Event Updates',
              desc: 'Be informed when events you follow are updated or cancelled',
            },
          ].map(({ key, label, desc }) => (
            <label
              key={key}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 cursor-pointer transition"
            >
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  id={`pref-${key}`}
                  checked={notifPrefs[key]}
                  onChange={(e) =>
                    setNotifPrefs({ ...notifPrefs, [key]: e.target.checked })
                  }
                  className="w-4 h-4 accent-primary rounded"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">{label}</p>
                <p className="text-xs text-neutral-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>

        <Button
          id="save-prefs"
          onClick={handleSavePrefs}
          disabled={savingPrefs}
          variant="outline"
          className="mt-5 w-full"
        >
          {savingPrefs ? 'Saving...' : 'Save Preferences'}
        </Button>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-1 text-neutral-800">Account</h2>
        <p className="text-sm text-neutral-500 mb-4">Sign out of your account</p>
        <Button
          id="logout-btn"
          onClick={handleLogout}
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 w-full"
        >
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
