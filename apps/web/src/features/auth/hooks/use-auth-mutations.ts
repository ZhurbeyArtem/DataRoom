import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import type { LoginInput, RegisterInput } from '@/types/api';
import { authApi } from '../api/auth';
import { useSessionStore } from '../stores/session.store';

/**
 * Повідомлення беремо з відповіді бекенду: він уже віддає їх українською
 * і з потрібним рівнем деталізації — «Невірний email або пароль» замість
 * технічного «401».
 */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Немає звʼязку з сервером. Перевір підключення';
}

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
