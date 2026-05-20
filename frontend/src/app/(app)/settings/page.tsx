'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUserOnly } from '@/hooks/useUserOnly';
import AccountTab from '@/components/settings/AccountTab';
import LedgersTab, { type SubTab } from '@/components/settings/LedgersTab';

type Tab = 'account' | 'ledgers';

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'account', label: 'アカウント' },
  { key: 'ledgers', label: '帳簿管理' },
];

const SettingsContent = () => {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'account');

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t && (t === 'account' || t === 'ledgers')) setTab(t);
  }, [searchParams]);

  const openLedgerId = searchParams.get('openLedger') ?? undefined;
  const subtabParam  = searchParams.get('subtab');
  const initialSubTab: SubTab | undefined =
    subtabParam === 'members' || subtabParam === 'info' ||
    subtabParam === 'categories' || subtabParam === 'delete'
      ? (subtabParam as SubTab)
      : undefined;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">設定</h1>

      {/* タブ */}
      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 gap-1">
        {TAB_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* アカウント設定タブ */}
      {tab === 'account' && <AccountTab />}

      {/* 帳簿管理タブ */}
      {tab === 'ledgers' && (
        <LedgersTab openLedgerId={openLedgerId} initialSubTab={initialSubTab} />
      )}
    </div>
  );
};

const SettingsPage = () => {
  const isAdmin = useUserOnly();
  if (isAdmin) return null;
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
};

export default SettingsPage;
