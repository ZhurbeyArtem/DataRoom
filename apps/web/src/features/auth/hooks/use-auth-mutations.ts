import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput } from '@/types/api';
import { authApi } from '../api/auth';
import { useSessionStore } from '../stores/session.store';

/**
 * Кеш запитів прив'язаний до сесії, а не до вкладки. Без очищення при зміні
 * користувача наступний власник браузера бачив би дані попереднього: у
 * найкращому випадку порожній список замість своїх кімнат, у гіршому —
 * чужі назви, поки не приїде свіжа відповідь.
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
    // Сесію гасимо в будь-якому разі: якщо сервер недоступний, користувач
    // усе одно натиснув «вийти» — тримати його залогіненим було б гірше.
    onSettled: () => {
      resetCache();
      clear();
    },
  });
}
