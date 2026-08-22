import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { useRestoreSession } from '@/features/auth/hooks/use-session';
import { AppProvider } from './provider';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree, defaultPreload: 'intent' });

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
    <AppProvider>
      <Session />
      <Toaster />
    </AppProvider>
  );
}
