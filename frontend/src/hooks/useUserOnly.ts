'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

/**
 * SYSTEM_ADMIN を /admin にリダイレクトするフック。
 * true を返す場合はコンポーネントが null を返して子コンポーネントの
 * レンダリング・APIコールを防ぐこと。
 */
export const useUserOnly = (): boolean => {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (role === 'SYSTEM_ADMIN') {
      router.replace('/admin');
    }
  }, [role, router]);

  return role === 'SYSTEM_ADMIN';
};
