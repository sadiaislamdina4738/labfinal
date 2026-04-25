import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getEventBySlug } from '@/lib/event-queries';
import { PhotoSubmission } from '@/models/PhotoSubmission';
import { createNotification } from '@/lib/notification-queries';
import type { ApiResponse } from '@/types';

// PATCH /api/events/[slug]/photos/[photoId] — approve or reject a photo
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; photoId: string } }
): Promise<NextResponse<ApiResponse>> {
  const user = getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized', error: 'Not authenticated' },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const event = await getEventBySlug(params.slug);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Not found' },
        { status: 404 }
      );
    }

    // Check if user is organizer of this event
    if (event.organizerId.toString() !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Only event organizers can approve photos', error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { approvalStatus } = body;

    if (!approvalStatus || !['approved', 'rejected'].includes(approvalStatus)) {
      return NextResponse.json(
        { success: false, message: 'Invalid approval status', error: 'Must be approved or rejected' },
        { status: 400 }
      );
    }

    // Find and update photo
    // @ts-ignore
    const photo = await PhotoSubmission.findById(params.photoId);
    if (!photo) {
      return NextResponse.json(
        { success: false, message: 'Photo not found', error: 'Not found' },
        { status: 404 }
      );
    }

    // Verify photo belongs to this event
    if (photo.eventId.toString() !== event._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'Photo does not belong to this event', error: 'Forbidden' },
        { status: 403 }
      );
    }

    photo.approvalStatus = approvalStatus;
    photo.approvedBy = user.id;

    // @ts-ignore
    await photo.save();

    // Send notification to uploader
    if (approvalStatus === 'approved') {
      await createNotification({
        recipientId: photo.userId.toString(),
        eventId: event._id.toString(),
        type: 'photo_approved',
        title: 'Photo Approved',
        message: `Your photo has been approved and is now visible in the event gallery`,
        priority: 'low',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Photo ${approvalStatus}`,
      data: {
        id: photo._id.toString(),
        approvalStatus: photo.approvalStatus,
      },
    });
  } catch (error) {
    console.error('Photo approval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process photo', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
