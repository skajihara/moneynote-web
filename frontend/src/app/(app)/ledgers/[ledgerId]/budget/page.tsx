'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const BudgetPage = () => {
  const router = useRouter();
  const { ledgerId } = useParams<{ ledgerId: string }>();
  useEffect(() => {
    router.replace(`/ledgers/${ledgerId}/reports`);
  }, [router, ledgerId]);
  return null;
};

export default BudgetPage;
