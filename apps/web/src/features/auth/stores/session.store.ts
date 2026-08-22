import { create } from 'zustand';
import { setAccessToken } from '@/lib/api-client';
import type { SessionUser } from '@/types/api';

/**
 * `unknown` — ще не зʼясували, чи є сесія: саме в цьому стані застосунок
 * показує скелетон, а не викидає на /login. Без цього третього значення
 * кожне перезавантаження сторінки блимало б формою входу перед тим,
 * як refresh-cookie відновить сесію.
 */
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface SessionState {
  user: SessionUser | null;
  status: SessionStatus;
  setSession: (user: SessionUser, accessToken: string) => void;
  markAnonymous: () => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'unknown',

  setSession: (user, accessToken) => {
    setAccessToken(accessToken);
    set({ user, status: 'authenticated' });
  },

  markAnonymous: () => set({ user: null, status: 'anonymous' }),

  clear: () => {
    setAccessToken(null);
    set({ user: null, status: 'anonymous' });
  },
}));
