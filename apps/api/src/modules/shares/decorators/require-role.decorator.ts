import { SetMetadata } from '@nestjs/common';
import type { AccessRole } from '../interfaces/access.interface';

export const ACCESS_ROLE_KEY = 'access-role';

/**
 * There are two values today: OWNER for mutations, VIEWER for reads.
 * When EDITOR appears, it is added to AccessRole and to a single check
 * inside AccessGuard — the rest of the code stays as it is.
 */
export const RequireRole = (role: AccessRole) => SetMetadata(ACCESS_ROLE_KEY, role);
