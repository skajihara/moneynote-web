'use client';

import { useState } from 'react';
import { searchTransactions } from '@/lib/api/transaction';
import { getCategories, type Category } from '@/lib/api/ledger';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import type { Transaction } from '@/types/transaction';
import { useEffect } from 'react';

type Props = {
  ledgerId: string;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const SearchTab = ({ ledgerId }: Props) => {
  const addToast = useToastStore((s) => s.add);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);

  useEffect(() => {
    getCategories(ledgerId)
      .then((r) => setCategories(r.data))
      .catch(() => {});
  }, [ledgerId]);

  const handleSearch = async () => {
    setLoading(true);
    setSelected(null);
    try {
      const res = await searchTransactions(ledgerId, {
        keyword: keyword || undefined,
        categoryId: categoryId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setResults(res.data);
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '検索に失敗しました';
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">取引検索</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">キーワード（メモ）</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="例: コンビニ"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '検索中…' : '検索'}
        </button>
      </div>

      {/* 結果 */}
      {results !== null && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-500">
            {results.length} 件
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">該当する明細がありません</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((t) => (
                <button
                  key={t.transactionId}
                  onClick={() => setSelected(selected?.transactionId === t.transactionId ? null : t)}
                  className={`w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors ${
                    selected?.transactionId === t.transactionId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 mr-2">{t.transactionDate}</span>
                      <span className="text-sm text-gray-700">{t.categoryName ?? '未分類'}</span>
                      {t.memo && <span className="text-xs text-gray-400 ml-2">{t.memo}</span>}
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        t.transactionType === 'INCOME' ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {t.transactionType === 'INCOME' ? '+' : '-'}{fmt(t.amount)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 詳細パネル */}
      {selected && (
        <div className="bg-white rounded-lg border border-blue-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">明細詳細</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">日付</dt><dd>{selected.transactionDate}</dd>
            <dt className="text-gray-500">種別</dt>
            <dd className={selected.transactionType === 'INCOME' ? 'text-green-600' : 'text-red-500'}>
              {selected.transactionType === 'INCOME' ? '収入' : '支出'}
            </dd>
            <dt className="text-gray-500">金額</dt><dd>{fmt(selected.amount)}</dd>
            <dt className="text-gray-500">カテゴリ</dt><dd>{selected.categoryName ?? '未分類'}</dd>
            {selected.memo && (<><dt className="text-gray-500">メモ</dt><dd>{selected.memo}</dd></>)}
            {selected.isFixedOrigin && (
              <><dt className="text-gray-500">固定費</dt><dd className="text-blue-500">固定費由来</dd></>
            )}
          </dl>
        </div>
      )}
    </div>
  );
};

export default SearchTab;
