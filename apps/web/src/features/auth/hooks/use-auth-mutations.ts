import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput } from '@/types/api';
import { authApi } from '../api/auth';
import { useSessionStore } from '../stores/session.store';

/**
 * The query cache belongs to the session, not to the tab. Without clearing
 * it on a user change, the next person at this browser would see the
 * previous user's data: at best an empty list instead of their own rooms, at
 * worst someone else's room names until fresh responses arrive.
 */
function useResetCacheOnSessionChange() {
  const client = useQueryClient();
  return () => client.clear();
}

export function useLogin() {
  const setSession = useSessionStore((state) => state.setSession);
  const resetCache = useResetCacheOnSessionChange();

  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (result) => {
      resetCache();
      setSession(result.user, result.accessToken);
    },
  });
}

export function useRegister() {
  const setSession = useSessionStore((state) => state.setSession);
  const resetCache = useResetCacheOnSessionChange();

  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (result) => {
      resetCache();
      setSession(result.user, result.accessToken);
    },
  });
}

export function useLogout() {
  const clear = useSessionStore((state) => state.clear);
  const resetCache = useResetCacheOnSessionChange();

  return useMutation({
    mutationFn: () => authApi.logout(),
    // Kill the session either way: if the server is unreachable the user
    // still pressed "sign out" — keeping them signed in would be worse.
    onSettled: () => {
      resetCache();
      clear();
    },
  });
}
