import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { VenueLayout } from '@/models/VenueLayout';
import type { ApiResponse } from '@/types';

// GET /api/organizer/venue-layouts/[id] — fetch a specific layout
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // @ts-ignore
    const layout = await VenueLayout.findById(params.id).lean();

    if (!layout) {
      return NextResponse.json(
        { success: false, message: 'Layout not found', error: 'Not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (layout.organizerId.toString() !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Layout fetched',
      data: {
        id: layout._id.toString(),
        name: layout.name,
        canvasWidth: layout.canvasWidth,
        canvasHeight: layout.canvasHeight,
        items: layout.items,
        budgetEstimate: layout.budgetEstimate,
        eventId: layout.eventId,
        isPublished: layout.isPublished,
      },
    });
  } catch (error) {
    console.error('Layout fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch layout', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizer/venue-layouts/[id] — delete a layout
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // @ts-ignore
    const layout = await VenueLayout.findById(params.id);

    if (!layout) {
      return NextResponse.json(
        { success: false, message: 'Layout not found', error: 'Not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (layout.organizerId.toString() !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', error: 'Forbidden' },
        { status: 403 }
      );
    }

    // @ts-ignore
    await VenueLayout.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Layout deleted',
    });
  } catch (error) {
    console.error('Layout delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete layout', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
