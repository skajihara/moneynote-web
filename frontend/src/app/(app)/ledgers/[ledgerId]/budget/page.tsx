'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserOnly } from '@/hooks/useUserOnly';

const BudgetPage = () => {
  const isAdmin = useUserOnly();
  const router = useRouter();
  const { ledgerId } = useParams<{ ledgerId: string }>();
  useEffect(() => {
    if (!isAdmin) {
      router.replace(`/ledgers/${ledgerId}/reports`);
    }
  }, [isAdmin, router, ledgerId]);
  return null;
};

export default BudgetPage;
