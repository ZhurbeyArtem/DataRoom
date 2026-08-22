import { Link, Navigate, Outlet, createFileRoute } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/config/paths';
import { UserMenu } from '@/features/auth/components/user-menu';
import { useSessionStore } from '@/features/auth/stores/session.store';

export const Route = createFileRoute('/_authed')({ component: AuthedLayout });

function AuthedLayout() {
  const status = useSessionStore((state) => state.status);

  // Поки сесія невідома — скелетон, а не редірект. Інакше кожне
  // перезавантаження сторінки блимало б формою входу, доки refresh-cookie
  // не встигне відновити сесію.
  if (status === 'unknown') return <AppSkeleton />;

  if (status === 'anonymous') return <Navigate to={paths.login} replace />;

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to={paths.home} className="font-medium tracking-tight">
            Data Room
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function AppSkeleton() {
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-40" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="h-8 w-56" />
      </main>
    </div>
  );
}
