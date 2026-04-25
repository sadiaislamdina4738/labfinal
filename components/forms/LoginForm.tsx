'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserRole } from '@/types';

export interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Login failed');
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
        const role: UserRole = data.data.user.role;
        const roleRoutes: Record<UserRole, string> = {
          attendee: '/dashboard/attendee',
          organizer: '/dashboard/organizer',
          vendor: '/dashboard/vendor',
          admin: '/dashboard/admin',
        };
        router.push(roleRoutes[role] ?? '/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        name="email"
        placeholder="Email address"
        required
        disabled={loading}
      />
      <Input
        type="password"
        name="password"
        placeholder="Password"
        required
        disabled={loading}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
