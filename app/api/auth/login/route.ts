import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, createToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import { findUserByEmail } from '@/lib/user-queries';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing credentials', error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials', error: 'Email or password is incorrect' },
        { status: 401 }
      );
    }

    // Verify password
    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials', error: 'Email or password is incorrect' },
        { status: 401 }
      );
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials', error: 'Email or password is incorrect' },
        { status: 401 }
      );
    }

    // Create token
    const token = createToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Return user data with token
    const response = {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    };

    const res = NextResponse.json(response, { status: 200 });
    res.cookies.set('token', token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
