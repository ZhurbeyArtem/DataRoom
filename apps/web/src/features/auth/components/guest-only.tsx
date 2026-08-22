import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/config/paths';
import { useSessionStore } from '../stores/session.store';

/**
 * Дзеркало захищеної гілки: залогінений користувач не має бачити форму
 * входу. Поки сесія невідома — скелетон, інакше форма блимала б перед
 * редіректом на головну.
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const status = useSessionStore((state) => state.status);

  if (status === 'unknown') {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="mx-auto h-6 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (status === 'authenticated') return <Navigate to={paths.home} replace />;

  return <>{children}</>;
}
