'use client';

import { useLedgerStore } from '@/stores/ledgerStore';
import FixedTransactionList from '@/components/fixed/FixedTransactionList';

const FixedTransactionsPage = () => {
  const selectedLedgerId = useLedgerStore((s) => s.selectedLedgerId);

  if (!selectedLedgerId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">固定費</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-400 text-sm">帳簿を選択してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">固定費</h1>
      <FixedTransactionList ledgerId={selectedLedgerId} />
    </div>
  );
};

export default FixedTransactionsPage;
