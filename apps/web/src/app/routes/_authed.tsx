import { Link, Navigate, Outlet, createFileRoute } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/config/paths';
import { UserMenu } from '@/features/auth/components/user-menu';
import { useSessionStore } from '@/features/auth/stores/session.store';
import { UploadPanel } from '@/features/items/upload/components/upload-panel';

export const Route = createFileRoute('/_authed')({ component: AuthedLayout });

function AuthedLayout() {
  const status = useSessionStore((state) => state.status);

  // While the session is unknown, show a skeleton rather than redirecting.
  // Otherwise every page reload would flash the sign-in form until the
  // refresh cookie restores the session.
  if (status === 'unknown') return <AppSkeleton />;

  if (status === 'anonymous') return <Navigate to={paths.login} replace />;

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-5">
            <Link to={paths.home} className="font-medium tracking-tight">
              Data Room
            </Link>
            <Link
              to={paths.sharedWithMe}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Shared with me
            </Link>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      {/* The panel lives in the layout rather than in the folder view:
          uploads must keep running when the user moves to another folder or
          room. */}
      <UploadPanel />
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
