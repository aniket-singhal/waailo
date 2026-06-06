import { ApiError, ApiErrorBody, TokenPair } from './types';
import { tokenStore } from './token-store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skip attaching the bearer token (used for login/signup/refresh). */
  anonymous?: boolean;
  /** Internal: prevents infinite refresh recursion. */
  _retried?: boolean;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: { error?: ApiErrorBody } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON error */
  }
  const e = body.error;
  return new ApiError(
    res.status,
    e?.code ?? 'UNKNOWN',
    e?.message ?? res.statusText ?? 'Request failed',
    e?.details,
  );
}

/** Calls the refresh endpoint and stores the rotated pair. Returns success. */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    tokenStore.clear();
    return false;
  }
  const pair = (await res.json()) as TokenPair;
  tokenStore.set(pair);
  return true;
}

/**
 * Typed fetch wrapper. Attaches the bearer token, transparently refreshes once
 * on a 401, and converts error envelopes into a thrown ApiError.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!options.anonymous) {
    const access = tokenStore.getAccess();
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && !options.anonymous && !options._retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export { BASE_URL };
