'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLedgerStore } from '@/stores/ledgerStore';
import FixedTransactionList from '@/components/fixed/FixedTransactionList';

type Tab = 'fixed' | 'general';

const SettingsContent = () => {
  const searchParams = useSearchParams();
  const selectedLedgerId = useLedgerStore((s) => s.selectedLedgerId);
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'fixed');

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t) setTab(t);
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800">設定</h1>

      {/* タブ */}
      <div className="flex border-b border-gray-200 gap-1">
        {([['fixed', '固定費'], ['general', '一般']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 固定費タブ */}
      {tab === 'fixed' && (
        <div>
          {selectedLedgerId ? (
            <FixedTransactionList ledgerId={selectedLedgerId} />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">帳簿を選択してください</p>
            </div>
          )}
        </div>
      )}

      {/* 一般タブ */}
      {tab === 'general' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-400 text-sm text-center">準備中</p>
        </div>
      )}
    </div>
  );
};

const SettingsPage = () => (
  <Suspense>
    <SettingsContent />
  </Suspense>
);

export default SettingsPage;
