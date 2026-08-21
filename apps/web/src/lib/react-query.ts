import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Саме це змушує екран глядача, у якого відкликали доступ, оновитися
        // самому — щойно він поверне фокус на вкладку.
        refetchOnWindowFocus: true,
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // 404 у нас означає «немає або немає доступу» — повторювати марно.
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
