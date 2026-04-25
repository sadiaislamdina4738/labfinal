import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import connectDB from '@/lib/db';
import { findUserById, updateUserById } from '@/lib/user-queries';
import type { ApiResponse, IUser } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Fetch full user data from DB
    const userDoc = await findUserById(user.id);

    if (!userDoc) {
      return unauthorizedResponse();
    }

    return NextResponse.json({
      success: true,
      message: 'Profile fetched',
      data: {
        id: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        avatarUrl: userDoc.avatarUrl,
        bio: userDoc.bio,
        interests: userDoc.interests,
        notificationPreferences: userDoc.notificationPreferences,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const user = getCurrentUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const updates = await request.json();

    // Only admins can change roles
    if ('role' in updates && user.role !== 'admin') {
      return forbiddenResponse('Only admins can change user roles');
    }

    // Allowed fields to update
    const allowedUpdates = ['name', 'bio', 'avatarUrl', 'role', 'interests', 'notificationPreferences'];
    const filteredUpdates: Record<string, unknown> = {};

    for (const key of allowedUpdates) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    const userDoc = await updateUserById(user.id, filteredUpdates);

    if (!userDoc) {
      return unauthorizedResponse();
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated',
      data: {
        id: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        avatarUrl: userDoc.avatarUrl,
        bio: userDoc.bio,
        interests: userDoc.interests,
        notificationPreferences: userDoc.notificationPreferences,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
