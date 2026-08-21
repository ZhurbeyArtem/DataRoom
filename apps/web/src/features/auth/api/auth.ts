import { api } from '@/lib/api-client';
import type { AuthResult, LoginInput, RegisterInput, SessionUser } from '@/types/api';

export const authApi = {
  register: (body: RegisterInput) =>
    api.post<AuthResult>('/auth/register', body),

  login: (body: LoginInput) =>
    api.post<AuthResult>('/auth/login', body),

  /** Повертає ту саму форму, що login — тому відновлення сесії не потребує окремого ендпоінта. */
  refresh: () => api.post<AuthResult>('/auth/refresh'),

  logout: () => api.post<{ ok: true }>('/auth/logout'),

  me: () => api.get<SessionUser>('/auth/me'),
};
