'use client';

import { useUserOnly } from '@/hooks/useUserOnly';
import { useLedgerStore } from '@/stores/ledgerStore';
import CsvExport from '@/components/csv/CsvExport';
import CsvImport from '@/components/csv/CsvImport';

const CsvPage = () => {
  const isAdmin = useUserOnly();
  const selectedLedgerId = useLedgerStore((s) => s.selectedLedgerId);
  if (isAdmin) return null;

  if (!selectedLedgerId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">CSV</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-400 text-sm">帳簿を選択してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">CSV</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <CsvExport ledgerId={selectedLedgerId} />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <CsvImport ledgerId={selectedLedgerId} />
      </div>
    </div>
  );
};

export default CsvPage;
