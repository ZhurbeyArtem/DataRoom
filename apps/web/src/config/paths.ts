/**
 * Every route in one place: renaming a page does not turn into a hunt for
 * string literals across the project.
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
