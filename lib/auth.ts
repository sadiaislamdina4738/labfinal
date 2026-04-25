import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { SessionUser, UserRole } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = '7d';

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a JWT token
 */
export function createToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get token from request headers
 */
export function getTokenFromRequest(headers: Record<string, string | string[] | undefined>): string | null {
  const authHeader = headers['authorization'] || headers['Authorization'];

  if (!authHeader) {
    return null;
  }

  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!headerValue) {
    return null;
  }

  const parts = headerValue.split(' ');
  const scheme = parts[0];
  const token = parts[1];

  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
}

/**
 * Get current user from request
 */
export function getCurrentUserFromRequest(request: NextRequest): SessionUser | null {
  const token = getTokenFromRequest(request.headers as unknown as Record<string, string | string[] | undefined>)
    || request.cookies.get('token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, message, error: 'Unauthorized' },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, message, error: 'Forbidden' },
    { status: 403 }
  );
}

/**
 * Middleware to require authentication
 */
export function requireAuth(handler: (req: NextRequest, user: SessionUser) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const user = getCurrentUserFromRequest(req);

    if (!user) {
      return unauthorizedResponse('Authentication required');
    }

    return handler(req, user);
  };
}

/**
 * Middleware to require specific role
 */
export function requireRole(role: UserRole | UserRole[], handler: (req: NextRequest, user: SessionUser) => Promise<NextResponse>) {
  return requireAuth(async (req, user) => {
    const roles = Array.isArray(role) ? role : [role];

    if (!roles.includes(user.role)) {
      return forbiddenResponse('Insufficient permissions');
    }

    return handler(req, user);
  });
}
