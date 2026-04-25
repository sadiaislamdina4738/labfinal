import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getEventBySlug } from '@/lib/event-queries';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { PhotoSubmission } from '@/models/PhotoSubmission';
import { RSVP } from '@/models/RSVP';
import { User } from '@/models/User';
import type { ApiResponse } from '@/types';

// GET /api/events/[slug]/photos — fetch approved photos for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    const event = await getEventBySlug(params.slug);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found', error: 'Not found' },
        { status: 404 }
      );
    }

    // Fetch approved photos for this event
    // @ts-ignore - Mongoose typing
    const photos = await PhotoSubmission.find({
      eventId: event._id,
      approvalStatus: 'approved',
    })
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Photos fetched',
      data: {
        photos: photos.map((p: any) => ({
          id: p._id.toString(),
          imageUrl: p.imageUrl,
          caption: p.caption,
          uploader: {
            name: p.userId?.name || 'Anonymous',
            avatarUrl: p.userId?.avatarUrl,
          },
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Photos fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch photos', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/events/[slug]/photos — upload a photo
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
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

    // Check if event has ended
    if (new Date(event.endDateTime) > new Date()) {
      return NextResponse.json(
        { success: false, message: 'Event must be completed to upload photos', error: 'Event not over' },
        { status: 400 }
      );
    }

    // Check if user has RSVP'd as "going"
    // @ts-ignore
    const userRsvp = await RSVP.findOne({
      userId: user.id,
      eventId: event._id,
      status: 'going',
    });

    if (!userRsvp) {
      return NextResponse.json(
        { success: false, message: 'Must be attending to upload photos', error: 'No valid RSVP' },
        { status: 403 }
      );
    }

    // Check photo limit (max 3 per user per event)
    // @ts-ignore
    const existingPhotos = await PhotoSubmission.countDocuments({
      userId: user.id,
      eventId: event._id,
    });

    if (existingPhotos >= 3) {
      return NextResponse.json(
        { success: false, message: 'You can upload a maximum of 3 photos per event', error: 'Photo limit exceeded' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { imageBase64, caption } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid image data', error: 'Missing imageBase64' },
        { status: 400 }
      );
    }

    // Validate caption
    if (caption && (typeof caption !== 'string' || caption.length > 200)) {
      return NextResponse.json(
        { success: false, message: 'Caption must be 200 characters or less', error: 'Invalid caption' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const { url } = await uploadToCloudinary(imageBase64, `eventease/events/${event._id}`);

    // Save photo submission
    const photo = new PhotoSubmission({
      userId: user.id,
      eventId: event._id,
      imageUrl: url,
      caption: caption || '',
      approvalStatus: 'pending',
    });

    // @ts-ignore
    await photo.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Photo uploaded successfully',
        data: {
          id: photo._id.toString(),
          imageUrl: photo.imageUrl,
          approvalStatus: photo.approvalStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload photo', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
