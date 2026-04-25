'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Badge,
  Avatar,
  Select,
  Skeleton,
  Spinner,
} from '@/components/ui';

export default function ComponentsDemoPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('attendee');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-12 text-neutral-900">
          EventEase UI Components Demo
        </h1>

        {/* Button Variants */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-neutral-800">Buttons</h2>
          <Card>
            <CardBody className="flex flex-wrap gap-4">
              <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Primary Button'}
              </Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger">Danger Button</Button>
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
            </CardBody>
          </Card>
        </section>

        {/* Input & Form */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-neutral-800">Form Components</h2>
          <Card>
            <CardBody className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText="We'll never share your email"
              />
              <Select
                label="Select Role"
                options={[
                  { value: 'attendee', label: 'Attendee' },
                  { value: 'organizer', label: 'Organizer' },
                  { value: 'vendor', label: 'Vendor' },
                  { value: 'admin', label: 'Admin' },
                ]}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                error={email.length > 0 && !email.includes('@') ? 'Invalid email' : undefined}
              />
              <Button variant="primary" className="w-full" onClick={handleSubmit}>
                {isLoading ? 'Submitting...' : 'Submit Form'}
              </Button>
            </CardBody>
          </Card>
        </section>

        {/* Badges */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-neutral-800">Badges</h2>
          <Card>
            <CardBody className="flex flex-wrap gap-4">
              <Badge variant="primary">Tech</Badge>
              <Badge variant="secondary">Music</Badge>
              <Badge variant="success">Going</Badge>
              <Badge variant="warning">Interested</Badge>
              <Badge variant="danger">Full</Badge>
              <Badge variant="neutral">Business</Badge>
              <Badge variant="primary" size="sm">
                Small Badge
              </Badge>
            </CardBody>
          </Card>
        </section>

        {/* Avatars */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-neutral-800">Avatars</h2>
          <Card>
            <CardBody className="flex gap-6 items-center flex-wrap">
              <Avatar name="John Doe" size="sm" />
              <Avatar name="Jane Smith" size="md" />
              <Avatar name="Alice Johnson" size="lg" />
              <Avatar name="Bob Wilson" size="xl" />
              <Avatar name="Profile" size="md" />
            </CardBody>
          </Card>
        </section>

        {/* Loading States */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-neutral-800">Loading States</h2>
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Skeleton Loader</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Skeleton height={20} width="100%" />
                <Skeleton height={20} width="80%" />
                <Skeleton height={100} width="100%" />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold">Spinners</h3>
              </CardHeader>
              <CardBody className="flex gap-6 items-center justify-center">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" color="primary" />
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Card Variants */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-neutral-800">Card Variants</h2>
          <div className="grid grid-cols-2 gap-6">
            <Card variant="default">
              <CardHeader>Default Card</CardHeader>
              <CardBody>This is the default card variant</CardBody>
              <CardFooter className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button variant="primary" size="sm">
                  Save
                </Button>
              </CardFooter>
            </Card>

            <Card variant="elevated">
              <CardHeader>Elevated Card</CardHeader>
              <CardBody>This is the elevated card variant with shadow</CardBody>
            </Card>

            <Card variant="outlined">
              <CardHeader>Outlined Card</CardHeader>
              <CardBody>This is the outlined card variant</CardBody>
            </Card>

            <Card variant="soft">
              <CardHeader>Soft Card</CardHeader>
              <CardBody>This is the soft card variant</CardBody>
            </Card>
          </div>
        </section>

        {/* Events Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-neutral-800">Event Card Example</h2>
          <Card variant="elevated">
            <CardBody>
              <div className="flex items-start gap-4">
                <Skeleton variant="circular" width={64} height={64} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold">Tech Summit 2026</h3>
                    <Badge variant="primary">tech</Badge>
                  </div>
                  <p className="text-neutral-600 mb-3">
                    Join the most exciting tech conference of 2026!
                  </p>
                  <div className="flex gap-4 mb-4">
                    <div className="text-sm">
                      <p className="text-neutral-500">April 25, 2026</p>
                      <p className="font-medium">9:25 AM - 5:25 PM</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-neutral-500">Dhaka Tech Hub</p>
                      <p className="font-medium">200 Capacity</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm">
                      RSVP Going
                    </Button>
                    <Button variant="outline" size="sm">
                      Interested
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Demo Footer */}
        <div className="text-center py-8 text-neutral-600">
          <p>All components are working correctly! ✅</p>
        </div>
      </div>
    </div>
  );
}
