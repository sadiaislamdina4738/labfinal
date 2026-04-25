import { Card } from '@/components/ui/Card';
import { EventCreateForm } from '@/components/forms/EventCreateForm';

export const metadata = {
  title: 'Create Event | EventEase',
  description: 'Create a new event',
};

export default function NewEventPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Event</h1>
        <p className="text-neutral-600">Fill in the details to create your event</p>
      </div>

      <Card className="p-8">
        <EventCreateForm />
      </Card>
    </div>
  );
}
