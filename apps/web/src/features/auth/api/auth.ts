import { api } from '@/lib/api-client';
import type { AuthResult, LoginInput, RegisterInput, SessionUser } from '@/types/api';

// Оновлення сесії тут навмисно немає: воно живе в lib/api-client як
// refreshSession і має бути єдиним, бо refresh-токен ротується.

export const authApi = {
  register: (body: RegisterInput) =>
    api.post<AuthResult>('/auth/register', body),

  login: (body: LoginInput) =>
    api.post<AuthResult>('/auth/login', body),


  logout: () => api.post<{ ok: true }>('/auth/logout'),

  me: () => api.get<SessionUser>('/auth/me'),
};
