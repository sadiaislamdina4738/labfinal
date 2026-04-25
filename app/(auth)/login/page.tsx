import { Card } from '@/components/ui/Card';
import { LoginForm } from '@/components/forms/LoginForm';
import Link from 'next/link';

export const metadata = {
  title: 'Sign In | EventEase',
  description: 'Sign in to your EventEase account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neutral-soft flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-neutral-600">Sign in to your EventEase account</p>
        </div>

        <Card className="p-8">
          <LoginForm />

          <div className="mt-6 text-center text-sm">
            <p className="text-neutral-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:text-primary-light font-medium">
                Create one
              </Link>
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-neutral-500 mt-4">
          By signing in, you agree to our{' '}
          <a href="#" className="underline hover:no-underline">
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="#" className="underline hover:no-underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
