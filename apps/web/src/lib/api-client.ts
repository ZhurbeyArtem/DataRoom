import { env } from '@/config/env';

/**
 * Access-токен живе в памʼяті модуля, а не в localStorage: усе, що лежить
 * у сховищі, доступне будь-якому скрипту на сторінці. Після перезавантаження
 * сесія піднімається з httpOnly-cookie через /auth/refresh.
 */
let accessToken: string | null = null;
let shareToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Публічний глядач ходить у ті самі ендпоінти, лише з іншим заголовком. */
export function setShareToken(token: string | null): void {
  shareToken = token;
}

export class ApiError extends Error {
  // Явні поля, а не параметри-властивості: увімкнено erasableSyntaxOnly,
  // тобто TypeScript має стиратися в JS без залишку.
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }

  /** 404 у нас означає і «немає», і «немає доступу» — це навмисно. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

/** Викликається, коли оновити сесію не вдалося: застосунок має вийти. */
let onSessionLost: (() => void) | null = null;

export function setSessionLostHandler(handler: () => void): void {
  onSessionLost = handler;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

  // 401 означає, що протух короткий access-токен. Пробуємо оновити його
  // мовчки: refresh лежить у httpOnly-cookie, тож користувач нічого не бачить.
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (!(await refreshSession())) {
      onSessionLost?.();
      return unwrap<T>(response);
    }

    const retried = await send(path, options);

    // Свіжий токен і знову 401 — оновлювати більше нічого: сесію
    // відкликали на сервері. Без цього застосунок лишався б «залогіненим»
    // із мертвим токеном і сипав помилками замість екрана входу.
    if (retried.status === 401) onSessionLost?.();

    return unwrap<T>(retried);
  }

  return unwrap<T>(response);
}

function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (shareToken) headers['X-Share-Token'] = shareToken;

  return fetch(`${env.API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

interface RefreshedSession {
  accessToken: string;
  user: { id: string; email: string; name: string; avatarUrl?: string | null };
}

let refreshing: Promise<RefreshedSession | null> | null = null;

/**
 * Єдина точка оновлення сесії — і для відновлення при старті, і для повтору
 * після 401.
 *
 * Одночасність тут не оптимізація, а вимога коректності: refresh-токен
 * РОТУЄТЬСЯ, тобто кожне успішне оновлення відкликає попередній токен.
 * Два паралельні виклики означають, що другий піде вже відкликаним токеном,
 * отримає 401 — і застосунок вирішить, що сесії немає, хоча перший виклик
 * щойно її успішно оновив.
 */
export function refreshSession(): Promise<RefreshedSession | null> {
  refreshing ??= fetch(`${env.API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const payload = (await res.json()) as { data: RefreshedSession };
      setAccessToken(payload.data.accessToken);
      return payload.data;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

async function unwrap<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; code?: string; message?: string; requestId?: string }
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.code ?? 'UNKNOWN',
      payload?.message ?? 'Щось пішло не так',
      payload?.requestId,
    );
  }

  // Сторінки приходять як { data, nextCursor } і не загорнуті вдруге,
  // решта — як { data: … }.
  if (payload && typeof payload === 'object' && 'nextCursor' in payload) {
    return payload as T;
  }

  return (payload?.data ?? payload) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, options),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
