'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

// Точка входа: вошедшего отправляем в кабинет, остальных — на вход.
export default function IndexPage() {
  const router = useRouter();
  const { profile, ready } = useAuth();

  useEffect(() => {
    if (!ready) {
      return;
    }
    router.replace(profile ? '/dashboard' : '/login');
  }, [ready, profile, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-10 h-1 bg-accent animate-pulse" />
    </div>
  );
}
