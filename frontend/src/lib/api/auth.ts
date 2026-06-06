import { apiFetch } from './client';
import { tokenStore } from './token-store';
import type { Me, SignupResponse, TokenPair } from './types';

export async function login(companySlug: string, email: string, password: string): Promise<Me> {
  const pair = await apiFetch<TokenPair>('/auth/login', {
    method: 'POST',
    anonymous: true,
    body: { companySlug, email, password },
  });
  tokenStore.set(pair);
  return getMe();
}

export async function signup(
  companyName: string,
  ownerEmail: string,
  ownerPassword: string,
): Promise<Me> {
  const res = await apiFetch<SignupResponse>('/companies/signup', {
    method: 'POST',
    anonymous: true,
    body: { companyName, ownerEmail, ownerPassword },
  });
  tokenStore.set(res.tokens);
  return getMe();
}

export async function acceptInvite(token: string, password: string): Promise<Me> {
  const pair = await apiFetch<TokenPair>('/auth/accept-invite', {
    method: 'POST',
    anonymous: true,
    body: { token, password },
  });
  tokenStore.set(pair);
  return getMe();
}

export function getMe(): Promise<Me> {
  return apiFetch<Me>('/auth/me');
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.getRefresh();
  try {
    if (refreshToken) {
      await apiFetch<void>('/auth/logout', {
        method: 'POST',
        anonymous: true,
        body: { refreshToken },
      });
    }
  } finally {
    tokenStore.clear();
  }
}
