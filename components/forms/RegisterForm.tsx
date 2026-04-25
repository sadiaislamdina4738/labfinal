'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserRole } from '@/types';

export interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('attendee');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Registration failed');
        return;
      }

      // Store token and user data
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Dispatch event to notify other components (e.g., Navbar)
      window.dispatchEvent(new Event('auth-change'));

      if (onSuccess) {
        onSuccess();
      } else {
        // Role-based redirect
        const userRole: UserRole = data.data.user.role;
        const roleRoutes: Record<UserRole, string> = {
          attendee: '/dashboard/attendee',
          organizer: '/dashboard/organizer',
          vendor: '/dashboard/vendor',
          admin: '/dashboard/admin',
        };
        router.push(roleRoutes[userRole] ?? '/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        name="name"
        placeholder="Full name"
        required
        disabled={loading}
      />
      <Input
        type="email"
        name="email"
        placeholder="Email address"
        required
        disabled={loading}
      />
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          I'm joining as
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={loading}
          className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="attendee">Attendee</option>
          <option value="organizer">Organizer</option>
          <option value="vendor">Vendor</option>
        </select>
      </div>
      <Input
        type="password"
        name="password"
        placeholder="Password (min 6 characters)"
        required
        disabled={loading}
      />
      <Input
        type="password"
        name="confirmPassword"
        placeholder="Confirm password"
        required
        disabled={loading}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  );
}
