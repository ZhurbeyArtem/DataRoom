import { createFileRoute } from '@tanstack/react-router';
import { useSessionStore } from '@/features/auth/stores/session.store';

export const Route = createFileRoute('/_authed/')({ component: HomePage });

function HomePage() {
  const user = useSessionStore((state) => state.user);

  return (
    <div>
      <h1 className="text-2xl font-medium">Вітаємо, {user?.name}</h1>
      <p className="mt-2 text-muted-foreground">
        Список кімнат зʼявиться в наступній задачі.
      </p>
    </div>
  );
}
