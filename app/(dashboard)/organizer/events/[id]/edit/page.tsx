import { Card } from '@/components/ui/Card';
import { EventEditForm } from '@/components/forms/EventEditForm';

export const metadata = {
  title: 'Edit Event | EventEase',
  description: 'Edit your event details',
};

interface EditEventPageProps {
  params: { id: string };
}

export default function EditEventPage({ params }: EditEventPageProps) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Edit Event</h1>
        <p className="text-neutral-600">Update the details for your event</p>
      </div>

      <Card className="p-8">
        <EventEditForm eventId={params.id} />
      </Card>
    </div>
  );
}
