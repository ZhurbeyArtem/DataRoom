import { api } from '@/lib/api-client';
import type { AuthResult, LoginInput, RegisterInput, SessionUser } from '@/types/api';

// Session refresh is deliberately absent here: it lives in lib/api-client as
// refreshSession and has to be the only one, because the refresh token
// rotates.

export const authApi = {
  register: (body: RegisterInput) =>
    api.post<AuthResult>('/auth/register', body),

  login: (body: LoginInput) =>
    api.post<AuthResult>('/auth/login', body),


  logout: () => api.post<{ ok: true }>('/auth/logout'),

  me: () => api.get<SessionUser>('/auth/me'),
};
