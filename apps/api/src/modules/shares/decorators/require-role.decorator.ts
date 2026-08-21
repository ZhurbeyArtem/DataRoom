import { SetMetadata } from '@nestjs/common';
import type { AccessRole } from '../interfaces/access.interface';

export const ACCESS_ROLE_KEY = 'access-role';

/**
 * Зараз значень два: OWNER для мутацій, VIEWER для читання.
 * Коли зʼявиться EDITOR, він додається в AccessRole і в одну перевірку
 * всередині AccessGuard — решта коду не змінюється.
 */
export const RequireRole = (role: AccessRole) => SetMetadata(ACCESS_ROLE_KEY, role);
