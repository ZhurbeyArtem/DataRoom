/**
 * Усі маршрути в одному місці: перейменування сторінки не змушує шукати
 * рядки по всьому проєкту.
 */
export const paths = {
  home: '/',
  login: '/login',
  register: '/register',
  authCallback: '/auth/callback',
  room: (roomId: string) => `/rooms/${roomId}`,
  folder: (roomId: string, itemId: string) => `/rooms/${roomId}/${itemId}`,
  trash: (roomId: string) => `/rooms/${roomId}/trash`,
  sharedWithMe: '/shared-with-me',
  publicShare: (token: string) => `/shared/${token}`,
  publicFolder: (token: string, itemId: string) => `/shared/${token}/${itemId}`,
} as const;
