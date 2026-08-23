import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { setShareToken } from '@/lib/api-client';

export const Route = createFileRoute('/shared/$token')({
  // beforeLoad rather than useEffect: effects run AFTER mount, and the child
  // route manages to fire its first request before that — which would travel
  // without the token header and get a 404 on a perfectly valid link.
  beforeLoad: ({ params }) => {
    setShareToken(params.token);
  },
  component: PublicShell,
});

/**
 * The token goes into the http client and from there THE SAME requests as
 * the owner's are used. There are no separate "public" endpoints — the
 * header alone makes the difference.
 */
function PublicShell() {
  const { token } = Route.useParams();

  // The effect both sets and clears the token. Both halves are needed: in
  // StrictMode React does mount → cleanup → mount, so without setting it
  // again the token would vanish right after beforeLoad and every following
  // request would go without it.
  useEffect(() => {
    setShareToken(token);
    return () => setShareToken(null);
  }, [token]);

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="font-medium tracking-tight">Data Room</span>
          <Badge variant="secondary">View only</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
