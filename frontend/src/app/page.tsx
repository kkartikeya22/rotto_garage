'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const token = localStorage.getItem('token');

    if (!token || !isAuthenticated) {
      router.replace('/login');
      return;
    }

    router.replace('/dashboard');
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="rt-loading">
      <span>Loading...</span>
    </div>
  );
}