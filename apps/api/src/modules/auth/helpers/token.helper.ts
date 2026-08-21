import { createHash, randomBytes } from 'node:crypto';

/** Сам refresh-токен ніколи не лягає в БД — лише його хеш. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiryDate(ttlDays = 30): Date {
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}
