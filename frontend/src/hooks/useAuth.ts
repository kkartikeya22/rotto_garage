'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { TOKEN_KEY } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Shared singleton state
let sharedState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

const listeners = new Set<(state: AuthState) => void>();

const setSharedState = (next: AuthState) => {
  console.log('🔥 setSharedState CALLED');
  console.log('Previous State:', sharedState);
  console.log('Next State:', next);

  sharedState = next;

  console.log('Listeners Count:', listeners.size);

  listeners.forEach((listener) => {
    console.log('📢 Notifying listener');
    listener(next);
  });

  console.log('✅ setSharedState COMPLETE');
};

let initialized = false;

export const useAuth = () => {
  const router = useRouter();
  const [state, setState] = useState(sharedState);

  console.log('🔄 useAuth render', {
    state,
    initialized,
  });

  useEffect(() => {
    console.log('➕ Listener registered');

    listeners.add(setState);

    return () => {
      console.log('➖ Listener removed');
      listeners.delete(setState);
    };
  }, []);

  useEffect(() => {
    console.log('🚀 Auth bootstrap effect started');
    console.log('initialized =', initialized);
    console.log('sharedState =', sharedState);

    if (initialized) {
      console.log('⏭️ Skipping bootstrap because already initialized');
      return;
    }

    initialized = true;

    console.log('✅ initialized set to true');

    const token = localStorage.getItem(TOKEN_KEY);

    console.log('🔑 TOKEN_KEY =', TOKEN_KEY);
    console.log('🔑 token =', token);

    if (!token) {
      console.log('❌ No token found');

      setSharedState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      return;
    }

    try {
      console.log('📝 Decoding token');

      const payload = JSON.parse(atob(token.split('.')[1]));

      console.log('📦 Token payload:', payload);

      const expiry = payload.exp * 1000;

      console.log('⏰ Expiry:', new Date(expiry));
      console.log('⏰ Now:', new Date());

      if (expiry < Date.now()) {
        console.log('❌ Token expired');

        localStorage.removeItem(TOKEN_KEY);

        setSharedState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });

        return;
      }

      console.log('✅ Token valid');

      setSharedState({
        user: payload as User,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('💥 Token parse failed:', error);

      localStorage.removeItem(TOKEN_KEY);

      setSharedState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    console.log('📊 STATE CHANGED', state);
  }, [state]);

  const login = useCallback(
    (token: string, user: User) => {
      console.log('🔐 LOGIN CALLED');
      console.log('User:', user);

      localStorage.setItem(TOKEN_KEY, token);

      setSharedState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });

      router.push('/dashboard');
    },
    [router]
  );

  const logout = useCallback(() => {
    console.log('🚪 LOGOUT CALLED');

    localStorage.removeItem(TOKEN_KEY);

    setSharedState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    router.push('/login');
  }, [router]);

  return useMemo(
    () => ({
      ...state,
      login,
      logout,
    }),
    [state, login, logout]
  );
};