import { useEffect } from 'react';
import { refreshSession, setSessionLostHandler } from '@/lib/api-client';
import { useSessionStore } from '../stores/session.store';

/**
 * Called once at the app root. The access token lives in memory only, so
 * after a page reload the session is restored from the httpOnly cookie —
 * through the same /auth/refresh used when a token expires.
 */
export function useRestoreSession(): void {
  const status = useSessionStore((state) => state.status);
  const setSession = useSessionStore((state) => state.setSession);
  const markAnonymous = useSessionStore((state) => state.markAnonymous);
  const clear = useSessionStore((state) => state.clear);

  useEffect(() => {
    // When the http client fails to refresh the token, the app must sign
    // itself out rather than sit there with a visible UI and dead requests.
    setSessionLostHandler(clear);
  }, [clear]);

  useEffect(() => {
    if (status !== 'unknown') return;

    let cancelled = false;

    // refreshSession is deduplicated: a double effect call in StrictMode, or
    // several tabs, will not cause two rotations of the refresh token.
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
