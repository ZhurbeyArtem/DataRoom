import { create } from 'zustand';
import { setAccessToken } from '@/lib/api-client';
import type { SessionUser } from '@/types/api';

/**
 * `unknown` means we have not established yet whether a session exists:
 * in that state the app shows a skeleton instead of bouncing to /login.
 * Without this third value every page reload would flash the sign-in form
 * before the refresh cookie restores the session.
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
