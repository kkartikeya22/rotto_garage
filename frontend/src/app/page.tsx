'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TOKEN_KEY } from '@/lib/api';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token || !isAuthenticated) {
      window.location.replace('/login');
      return;
    }

    window.location.replace('/dashboard');
  }, [isAuthenticated, isLoading]);

  return (
    <div className="rt-loading">
      <span>Loading...</span>
    </div>
  );
}