'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Log whenever auth state changes
  useEffect(() => {
    console.log('AUTH STATE CHANGED:', {
      isLoading,
      isAuthenticated,
      path: window.location.pathname,
      token: localStorage.getItem('rotto_token'),
      timestamp: new Date().toISOString(),
    });
  }, [isLoading, isAuthenticated]);

  // Continuous logger every second
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('AUTH CHECK:', {
        isLoading,
        isAuthenticated,
        path: window.location.pathname,
        tokenExists: !!localStorage.getItem('rotto_token'),
        timestamp: new Date().toISOString(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, isAuthenticated]);

  // Redirect logic
  useEffect(() => {
    console.log('REDIRECT EFFECT RUNNING', {
      isLoading,
      isAuthenticated,
    });

    if (isLoading) {
      console.log('Still loading...');
      return;
    }

    if (isAuthenticated) {
      console.log('Redirecting to /dashboard');
      router.replace('/dashboard');
    } else {
      console.log('Redirecting to /login');
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="rt-loading">
      <span>
        Loading... ({isLoading ? 'loading' : 'loaded'})
      </span>
    </div>
  );
}