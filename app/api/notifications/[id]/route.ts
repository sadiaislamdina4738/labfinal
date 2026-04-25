import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCurrentUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { markNotificationAsRead } from '@/lib/notification-queries';
import { Notification } from '@/models/Notification';
import type { ApiResponse } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Verify the notification belongs to this user
    // @ts-ignore
    const notif = await Notification.findById(params.id).lean().exec() as any;
    if (!notif) {
      return NextResponse.json(
        { success: false, message: 'Notification not found', error: 'Not found' },
        { status: 404 }
      );
    }

    if (notif.recipientId.toString() !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Forbidden', error: 'Not your notification' },
        { status: 403 }
      );
    }

    await markNotificationAsRead(params.id);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update notification', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
