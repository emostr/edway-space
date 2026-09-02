'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Profile } from './types';

interface AuthValue {
  profile: Profile | null;
  ready: boolean;
  reload: () => Promise<Profile | null>;
  apply: (profile: Profile | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const next = await api.get<Profile>('/auth/me');
      setProfile(next);
      return next;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* сессия могла истечь — всё равно очищаем состояние */
    }
    setProfile(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      profile,
      ready,
      reload,
      apply: (next: Profile | null) => {
        setProfile(next);
        setReady(true);
      },
      logout,
    }),
    [profile, ready, reload, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth вызван вне AuthProvider');
  }
  return value;
}
