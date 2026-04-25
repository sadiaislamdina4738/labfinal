import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
    };

    const res = NextResponse.json(response, { status: 200 });
    res.cookies.set('token', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Logout failed', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
