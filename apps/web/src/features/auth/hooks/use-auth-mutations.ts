import { useMutation } from '@tanstack/react-query';
import type { LoginInput, RegisterInput } from '@/types/api';
import { authApi } from '../api/auth';
import { useSessionStore } from '../stores/session.store';

export function useLogin() {
  const setSession = useSessionStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (result) => setSession(result.user, result.accessToken),
  });
}

export function useRegister() {
  const setSession = useSessionStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (result) => setSession(result.user, result.accessToken),
  });
}

export function useLogout() {
  const clear = useSessionStore((state) => state.clear);

  return useMutation({
    mutationFn: () => authApi.logout(),
    // Сесію гасимо в будь-якому разі: якщо сервер недоступний, користувач
    // усе одно натиснув «вийти» — тримати його залогіненим було б гірше.
    onSettled: () => clear(),
  });
}
