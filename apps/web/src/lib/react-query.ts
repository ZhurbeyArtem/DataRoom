import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // This is what makes the screen of a viewer whose access was revoked
        // refresh by itself, the moment they focus the tab again.
        refetchOnWindowFocus: true,
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // A 404 here means "gone or not allowed" — retrying is pointless.
          if (error instanceof ApiError && (error.isNotFound || error.isUnauthorized)) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
