import { ApiError } from '@/lib/api-client';

/**
 * Messages come from the backend response: it already returns them at the
 * right level of detail — "Invalid email or password" rather than a bare
 * technical "401".
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'No connection to the server. Check your network';
}
