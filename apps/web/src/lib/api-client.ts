import { env } from '@/config/env';

/**
 * The access token lives in module memory rather than localStorage:
 * anything in storage is readable by any script on the page. After a reload
 * the session is restored from the httpOnly cookie via /auth/refresh.
 */
let accessToken: string | null = null;
let shareToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** A public viewer hits the same endpoints, only with a different header. */
export function setShareToken(token: string | null): void {
  shareToken = token;
}

export class ApiError extends Error {
  // Explicit fields rather than parameter properties: erasableSyntaxOnly is
  // on, i.e. TypeScript must erase into JS without a trace.
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

  /** A 404 here means both "gone" and "not allowed" — deliberately so. */
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

/** Called when the session could not be refreshed: the app must sign out. */
let onSessionLost: (() => void) | null = null;

export function setSessionLostHandler(handler: () => void): void {
  onSessionLost = handler;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

  // A 401 means the short-lived access token expired. Refresh it silently:
  // the refresh token sits in an httpOnly cookie, so the user sees nothing.
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (!(await refreshSession())) {
      onSessionLost?.();
      return unwrap<T>(response);
    }

    const retried = await send(path, options);

    // A fresh token and still a 401 — there is nothing left to refresh: the
    // session was revoked on the server. Without this the app would stay
    // "signed in" with a dead token and spray errors instead of showing the
    // sign-in screen.
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
 * The single place a session is refreshed — both for restoring it at
 * startup and for retrying after a 401.
 *
 * Deduplication here is not an optimisation but a correctness requirement:
 * the refresh token ROTATES, so every successful refresh revokes the
 * previous one. Two parallel calls mean the second one travels with an
 * already revoked token, gets a 401 — and the app concludes there is no
 * session, even though the first call had just refreshed it successfully.
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
      payload?.message ?? 'Something went wrong',
      payload?.requestId,
    );
  }

  // Pages arrive as { data, nextCursor } and are not wrapped twice;
  // everything else comes as { data: … }.
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
