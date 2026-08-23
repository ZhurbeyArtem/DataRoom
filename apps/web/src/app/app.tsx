import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { useRestoreSession } from '@/features/auth/hooks/use-session';
import { ErrorBoundary, ErrorScreen } from './error-boundary';
import { AppProvider } from './provider';
import { routeTree } from './routeTree.gen';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // An error inside a route is caught by the router's own boundary, so the
  // crash screen is wired up both here and outside — otherwise a route would
  // show TanStack's default technical output instead of ours.
  defaultErrorComponent: ({ error }) => <ErrorScreen error={error} />,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

/**
 * Session restore lives inside the providers: it goes through the same http
 * client as the rest of the app.
 */
function Session() {
  useRestoreSession();
  return <RouterProvider router={router} />;
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Session />
        <Toaster />
      </AppProvider>
    </ErrorBoundary>
  );
}
