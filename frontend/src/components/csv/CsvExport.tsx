'use client';

import { useEffect, useState } from 'react';
import { exportCsv } from '@/lib/api/csv';
import { getCategories, type Category } from '@/lib/api/ledger';
import { ApiClientError } from '@/lib/api/client';

type Props = {
  ledgerId: string;
};

const CsvExport = ({ ledgerId }: Props) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [includeFixed, setIncludeFixed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories(ledgerId).then((res) => {
      setCategories(res.data);
      setSelectedCategoryIds(res.data.map((c) => c.categoryId));
    });
  }, [ledgerId]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedCategoryIds(categories.map((c) => c.categoryId));
  const deselectAll = () => setSelectedCategoryIds([]);

  const handleExport = async () => {
    setError(null);
    setLoading(true);
    try {
      const blob = await exportCsv(ledgerId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        includeFixed,
      });

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moneynote_${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.error.message : 'エクスポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.categoryType === 'EXPENSE');
  const incomeCategories = categories.filter((c) => c.categoryType === 'INCOME');

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">CSVエクスポート</h2>
      <p className="text-sm text-gray-500">
        明細データをCSVファイルとしてダウンロードします。
      </p>

      {/* 日付範囲 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm text-gray-600" htmlFor="csv-start-date">
            開始日
          </label>
          <input
            id="csv-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600" htmlFor="csv-end-date">
            終了日
          </label>
          <input
            id="csv-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* カテゴリ絞り込み */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-600">カテゴリ絞り込み</p>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-blue-600 hover:underline"
            >
              全て選択
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-blue-600 hover:underline"
            >
              全て解除
            </button>
          </div>
          {expenseCategories.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">支出</p>
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map((c) => (
                  <label key={c.categoryId} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(c.categoryId)}
                      onChange={() => toggleCategory(c.categoryId)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{c.categoryName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {incomeCategories.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">収入</p>
              <div className="flex flex-wrap gap-2">
                {incomeCategories.map((c) => (
                  <label key={c.categoryId} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(c.categoryId)}
                      onChange={() => toggleCategory(c.categoryId)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{c.categoryName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 固定費チェックボックス */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={includeFixed}
          onChange={(e) => setIncludeFixed(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">固定費を含める</span>
      </label>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        onClick={handleExport}
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'エクスポート中...' : 'エクスポート'}
      </button>
    </div>
  );
};

export default CsvExport;
