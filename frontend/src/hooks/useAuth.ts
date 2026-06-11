'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { TOKEN_KEY } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ── Shared singleton state ──────────────────────────────────────────────────
let sharedState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

const listeners = new Set<(s: AuthState) => void>();

function setSharedState(next: AuthState) {
  sharedState = next;
  listeners.forEach((fn) => fn(next));
}
// ───────────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(sharedState);

  // Subscribe this component instance to shared updates
  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);

  // Bootstrap from localStorage once on first mount
  useEffect(() => {
    if (!sharedState.isLoading) return; // already bootstrapped by another instance

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setSharedState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        setSharedState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      setSharedState({ user: payload as User, isLoading: false, isAuthenticated: true });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setSharedState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const login = useCallback(
    (token: string, user: User) => {
      localStorage.setItem(TOKEN_KEY, token);
      setSharedState({ user, isLoading: false, isAuthenticated: true });
      router.push('/dashboard');
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setSharedState({ user: null, isLoading: false, isAuthenticated: false });
    router.push('/login');
  }, [router]);

  return { ...state, login, logout };
};