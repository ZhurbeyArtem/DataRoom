import { ApiError } from '@/lib/api-client';

/**
 * Повідомлення беремо з відповіді бекенду: він уже віддає їх українською
 * і з потрібним рівнем деталізації — «Невірний email або пароль» замість
 * технічного «401».
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Немає звʼязку з сервером. Перевір підключення';
}
