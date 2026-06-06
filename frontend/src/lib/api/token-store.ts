import type { TokenPair } from './types';

const ACCESS_KEY = 'waailo.accessToken';
const REFRESH_KEY = 'waailo.refreshToken';

/**
 * Holds the JWT pair. Persists to localStorage in the browser so a refresh of
 * the page keeps the session; falls back to in-memory in non-browser (tests).
 */
let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;

const hasWindow = (): boolean => typeof window !== 'undefined';

export const tokenStore = {
  getAccess(): string | null {
    if (hasWindow()) return window.localStorage.getItem(ACCESS_KEY);
    return memoryAccess;
  },
  getRefresh(): string | null {
    if (hasWindow()) return window.localStorage.getItem(REFRESH_KEY);
    return memoryRefresh;
  },
  set(pair: TokenPair): void {
    if (hasWindow()) {
      window.localStorage.setItem(ACCESS_KEY, pair.accessToken);
      window.localStorage.setItem(REFRESH_KEY, pair.refreshToken);
    }
    memoryAccess = pair.accessToken;
    memoryRefresh = pair.refreshToken;
  },
  clear(): void {
    if (hasWindow()) {
      window.localStorage.removeItem(ACCESS_KEY);
      window.localStorage.removeItem(REFRESH_KEY);
    }
    memoryAccess = null;
    memoryRefresh = null;
  },
};
