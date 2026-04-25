import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { VenueLayout } from '@/models/VenueLayout';
import type { ApiResponse, VenueLayoutItem } from '@/types';

// GET /api/organizer/venue-layouts — list layouts for current organizer
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
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
    const layouts = await VenueLayout.find({ organizerId: user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Layouts fetched',
      data: {
        layouts: layouts.map((l: any) => ({
          id: l._id.toString(),
          name: l.name,
          eventId: l.eventId,
          isPublished: l.isPublished,
          budgetEstimate: l.budgetEstimate,
          itemCount: l.items?.length || 0,
          createdAt: l.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Layouts fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch layouts', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/organizer/venue-layouts — create or update a layout
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const user = getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized', error: 'Not authenticated' },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const body = await request.json();
    const { id, name, canvasWidth, canvasHeight, items, eventId, isPublished } = body;

    if (!name || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, message: 'Invalid layout data', error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate budget
    const ITEM_PRICES: Record<string, number> = {
      table_round: 50,
      table_rect: 40,
      chair: 5,
      stage: 300,
      bar: 200,
      dance_floor: 500,
      plant: 15,
      custom_text: 0,
    };

    const budgetEstimate = items.reduce((sum: number, item: VenueLayoutItem) => {
      return sum + (ITEM_PRICES[item.type] || 0);
    }, 0);

    let layout;
    if (id) {
      // Update existing
      // @ts-ignore
      layout = await VenueLayout.findByIdAndUpdate(
        id,
        {
          name,
          canvasWidth,
          canvasHeight,
          items,
          budgetEstimate,
          eventId,
          isPublished,
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new
      layout = new VenueLayout({
        organizerId: user.id,
        name,
        canvasWidth,
        canvasHeight,
        items,
        budgetEstimate,
        eventId,
        isPublished,
      });
      // @ts-ignore
      await layout.save();
    }

    return NextResponse.json({
      success: true,
      message: id ? 'Layout updated' : 'Layout created',
      data: {
        id: layout._id.toString(),
        name: layout.name,
        budgetEstimate: layout.budgetEstimate,
      },
    });
  } catch (error) {
    console.error('Layout save error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save layout', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
