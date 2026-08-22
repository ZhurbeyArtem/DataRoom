import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { useRestoreSession } from '@/features/auth/hooks/use-session';
import { ErrorBoundary, ErrorScreen } from './error-boundary';
import { AppProvider } from './provider';
import { routeTree } from './routeTree.gen';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Помилку всередині маршруту ловить бар'єр роутера, тому екран падіння
  // задається і тут, і зовні — інакше маршрут показав би стандартний
  // технічний вивід TanStack замість нашого.
  defaultErrorComponent: ({ error }) => <ErrorScreen error={error} />,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

/**
 * Відновлення сесії живе всередині провайдерів: воно робить запит через
 * той самий http-клієнт, що й решта застосунку.
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
