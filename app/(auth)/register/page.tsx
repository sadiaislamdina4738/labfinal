import { Card } from '@/components/ui/Card';
import { RegisterForm } from '@/components/forms/RegisterForm';
import Link from 'next/link';

export const metadata = {
  title: 'Create Account | EventEase',
  description: 'Create a new EventEase account',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-neutral-soft flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Get started</h1>
          <p className="text-neutral-600">Create your EventEase account</p>
        </div>

        <Card className="p-8">
          <RegisterForm />

          <div className="mt-6 text-center text-sm">
            <p className="text-neutral-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary-light font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-neutral-500 mt-4">
          By creating an account, you agree to our{' '}
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
