import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { setShareToken } from '@/lib/api-client';

export const Route = createFileRoute('/shared/$token')({
  // Саме beforeLoad, а не useEffect: ефекти виконуються ПІСЛЯ монтування,
  // а дочірній маршрут устигає надіслати перший запит раніше — і той піде
  // без заголовка з токеном, отримавши 404 на цілком дійсне посилання.
  beforeLoad: ({ params }) => {
    setShareToken(params.token);
  },
  component: PublicShell,
});

/**
 * Токен кладеться в http-клієнт, і далі працюють ТІ САМІ запити, що й у
 * власника. Окремих «публічних» ендпоінтів немає — різницю робить лише
 * заголовок.
 */
function PublicShell() {
  const { token } = Route.useParams();

  // Ефект і ставить, і прибирає токен. Обидві половини потрібні: у StrictMode
  // React робить монтування → очищення → монтування, тож без повторного
  // встановлення токен зникав би одразу після beforeLoad, і всі наступні
  // запити йшли б без нього.
  useEffect(() => {
    setShareToken(token);
    return () => setShareToken(null);
  }, [token]);

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="font-medium tracking-tight">Data Room</span>
          <Badge variant="secondary">Лише перегляд</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
