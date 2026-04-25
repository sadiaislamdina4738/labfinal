import type { ApiResponse } from '@/types';

/**
 * Create a successful API response
 */
export function createSuccessResponse<T = unknown>(
  data: T,
  message: string = 'Success'
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  message: string,
  error?: unknown
): ApiResponse<null> {
  return {
    success: false,
    message,
    data: null,
    error: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Handle async route handlers with error catching
 */
export async function handleAsync<T>(
  handler: () => Promise<T>
): Promise<T | null> {
  try {
    return await handler();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
