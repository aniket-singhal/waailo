'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '@/lib/api/auth';
import { tokenStore } from '@/lib/api/token-store';
import type { Me, RoleName } from '@/lib/api/types';

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (companySlug: string, email: string, password: string) => Promise<void>;
  signup: (companyName: string, ownerEmail: string, ownerPassword: string) => Promise<void>;
  acceptInvite: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: RoleName[]) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const RANK: Record<RoleName, number> = { OWNER: 4, HR_ADMIN: 3, MANAGER: 2, EMPLOYEE: 1 };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount if a token is present.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!tokenStore.getAccess()) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.getMe();
        if (active) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (slug: string, email: string, password: string) => {
    setUser(await authApi.login(slug, email, password));
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    setUser(await authApi.signup(name, email, password));
  }, []);

  const acceptInvite = useCallback(async (token: string, password: string) => {
    setUser(await authApi.acceptInvite(token, password));
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: RoleName[]) => {
      if (!user) return false;
      const userRank = Math.max(...user.roles.map((r) => RANK[r] ?? 0), 0);
      const need = Math.min(...roles.map((r) => RANK[r] ?? 99));
      return userRank >= need;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, signup, acceptInvite, logout, hasRole }),
    [user, loading, login, signup, acceptInvite, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
