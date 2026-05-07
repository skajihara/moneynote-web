'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useToastStore } from '@/stores/toastStore';
import { searchTransactions, type TransactionSearchParams } from '@/lib/api/transaction';
import { getCategories, type Category } from '@/lib/api/ledger';
import { ApiClientError } from '@/lib/api/client';
import type { Transaction } from '@/types/transaction';
import TransactionList from '@/components/transaction/TransactionList';
import TransactionEditForm from '@/components/transaction/TransactionEditForm';

const SearchPage = () => {
  const selectedLedgerId = useLedgerStore((s) => s.selectedLedgerId);
  const getSelectedLedger = useLedgerStore((s) => s.getSelectedLedger);
  const { open: openPanel, close: closePanel } = useSubPanelStore();
  const addToast = useToastStore((s) => s.add);

  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lastParams, setLastParams] = useState<TransactionSearchParams | null>(null);

  useEffect(() => {
    if (!selectedLedgerId) return;
    getCategories(selectedLedgerId)
      .then((r) => setCategories(r.data))
      .catch(() => {});
  }, [selectedLedgerId]);

  const executeSearch = useCallback(
    async (params: TransactionSearchParams) => {
      if (!selectedLedgerId) return;
      setLoading(true);
      try {
        const res = await searchTransactions(selectedLedgerId, params);
        setResults(res.data);
      } catch (e) {
        const msg = e instanceof ApiClientError ? e.error.message : '検索に失敗しました';
        addToast('error', msg);
      } finally {
        setLoading(false);
      }
    },
    [selectedLedgerId, addToast]
  );

  const handleSearch = () => {
    const params: TransactionSearchParams = {
      keyword: keyword || undefined,
      categoryId: categoryId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    setLastParams(params);
    executeSearch(params);
  };

  const handleSuccess = useCallback(() => {
    closePanel();
    if (lastParams) executeSearch(lastParams);
  }, [closePanel, lastParams, executeSearch]);

  const openEditForm = useCallback(
    (transaction: Transaction) => {
      if (!selectedLedgerId) return;
      openPanel(
        <TransactionEditForm
          ledgerId={selectedLedgerId}
          transaction={transaction}
          onSuccess={handleSuccess}
          onCancel={closePanel}
        />
      );
    },
    [selectedLedgerId, openPanel, closePanel, handleSuccess]
  );

  if (!selectedLedgerId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">取引検索</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-400 text-sm">帳簿を選択してください</p>
        </div>
      </div>
    );
  }

  const ledgerName = getSelectedLedger()?.ledgerName;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
        取引検索
        {ledgerName && <span className="text-sm font-normal text-gray-400 ml-2">（{ledgerName}）</span>}
      </h1>

      {/* フィルターフォーム */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">キーワード（メモ）</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="例: コンビニ"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-gray-100"
              style={{ '--tw-ring-color': 'var(--theme-color)' } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">カテゴリ</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">すべて</option>
              <optgroup label="支出">
                {categories.filter((c) => c.categoryType === 'EXPENSE').map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                ))}
              </optgroup>
              <optgroup label="収入">
                {categories.filter((c) => c.categoryType === 'INCOME').map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-2 text-white text-sm rounded-md disabled:opacity-50 transition-colors"
          style={{ backgroundColor: 'var(--theme-color)' }}
        >
          {loading ? '検索中…' : '検索'}
        </button>
      </div>

      {/* 検索結果 */}
      {results !== null && (
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{results.length} 件</p>
          {results.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-400 text-sm">該当する明細がありません</p>
            </div>
          ) : (
            <TransactionList transactions={results} onEdit={openEditForm} />
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
