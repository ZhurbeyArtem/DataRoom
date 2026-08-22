import { useEffect } from 'react';
import { refreshSession, setSessionLostHandler } from '@/lib/api-client';
import { useSessionStore } from '../stores/session.store';

/**
 * Викликається один раз у корені застосунку. Access-токен живе лише
 * в памʼяті, тому після перезавантаження сторінки сесія піднімається
 * з httpOnly-cookie — тим самим /auth/refresh, що й при протуханні токена.
 */
export function useRestoreSession(): void {
  const status = useSessionStore((state) => state.status);
  const setSession = useSessionStore((state) => state.setSession);
  const markAnonymous = useSessionStore((state) => state.markAnonymous);
  const clear = useSessionStore((state) => state.clear);

  useEffect(() => {
    // Коли http-клієнт не зміг оновити токен, застосунок має вийти сам,
    // а не залишатися з видимим інтерфейсом і мертвими запитами.
    setSessionLostHandler(clear);
  }, [clear]);

  useEffect(() => {
    if (status !== 'unknown') return;

    let cancelled = false;

    // refreshSession дедуплікований: подвійний виклик ефекту в StrictMode
    // або кілька вкладок не спричинять двох ротацій refresh-токена.
    void refreshSession().then((session) => {
      if (cancelled) return;
      if (session) setSession(session.user, session.accessToken);
      else markAnonymous();
    });

    return () => {
      cancelled = true;
    };
  }, [status, setSession, markAnonymous]);
}

export function useSession() {
  return useSessionStore();
}

export function useCurrentUser(): SessionUserOrNull {
  return useSessionStore((state) => state.user);
}

type SessionUserOrNull = ReturnType<typeof useSessionStore.getState>['user'];
