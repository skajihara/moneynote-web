'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLedgerStore } from '@/stores/ledgerStore';
import FixedTransactionList from '@/components/fixed/FixedTransactionList';
import CsvExport from '@/components/csv/CsvExport';
import CsvImport from '@/components/csv/CsvImport';
import AccountTab from '@/components/settings/AccountTab';
import LedgersTab from '@/components/settings/LedgersTab';
import SearchTab from '@/components/settings/SearchTab';

type Tab = 'account' | 'ledgers' | 'fixed' | 'search' | 'csv';

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'account', label: 'アカウント' },
  { key: 'ledgers', label: '帳簿管理' },
  { key: 'fixed', label: '固定費' },
  { key: 'search', label: '取引検索' },
  { key: 'csv', label: 'CSV' },
];

const SettingsContent = () => {
  const searchParams = useSearchParams();
  const selectedLedgerId = useLedgerStore((s) => s.selectedLedgerId);
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'account');

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t) setTab(t);
  }, [searchParams]);

  const needsLedger = tab === 'fixed' || tab === 'search' || tab === 'csv';

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800">設定</h1>

      {/* タブ */}
      <div className="flex flex-wrap border-b border-gray-200 gap-1">
        {TAB_LABELS.map(({ key, label }) => (
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

      {/* 帳簿未選択の警告 */}
      {needsLedger && !selectedLedgerId && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">帳簿を選択してください</p>
        </div>
      )}

      {/* アカウント設定タブ */}
      {tab === 'account' && <AccountTab />}

      {/* 帳簿管理タブ */}
      {tab === 'ledgers' && <LedgersTab />}

      {/* 固定費タブ */}
      {tab === 'fixed' && selectedLedgerId && (
        <FixedTransactionList ledgerId={selectedLedgerId} />
      )}

      {/* 取引検索タブ */}
      {tab === 'search' && selectedLedgerId && (
        <SearchTab ledgerId={selectedLedgerId} />
      )}

      {/* CSVタブ */}
      {tab === 'csv' && selectedLedgerId && (
        <div className="space-y-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <CsvExport ledgerId={selectedLedgerId} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <CsvImport ledgerId={selectedLedgerId} />
          </div>
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
