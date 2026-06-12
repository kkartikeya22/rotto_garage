'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { TOKEN_KEY } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 AUTH PROVIDER STARTED');

    const token = localStorage.getItem(TOKEN_KEY);

    console.log('TOKEN:', token);

    if (!token) {
      console.log('❌ NO TOKEN');

      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.exp * 1000 < Date.now()) {
        console.log('❌ TOKEN EXPIRED');

        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.log('✅ USER AUTHENTICATED');

      setUser(payload as User);
    } catch (err) {
      console.log('❌ TOKEN PARSE FAILED', err);

      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(
    (token: string, user: User) => {
      localStorage.setItem(TOKEN_KEY, token);
      setUser(user);

      router.push('/dashboard');
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);

    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}