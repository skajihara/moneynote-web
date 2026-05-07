'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FixedTransaction } from '@/types/fixed';
import { INTERVAL_TYPE_LABELS } from '@/types/fixed';
import {
  getFixedTransactions,
  deleteFixedTransaction,
} from '@/lib/api/fixed';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorState from '@/components/ui/ErrorState';
import FixedTransactionForm from './FixedTransactionForm';

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

type Props = {
  ledgerId: string;
};

// ─── FixedEditDialog ─────────────────────────────────────────────────────────

type DialogProps = {
  ledgerId: string;
  item: FixedTransaction;
  onClose: () => void;
  onSaved: () => void;
};

const FixedEditDialog = ({ ledgerId, item, onClose, onSaved }: DialogProps) => {
  const addToast = useToastStore((s) => s.add);

  const handleDelete = async () => {
    if (!confirm('固定費由来の全明細も削除されます。よろしいですか？')) return;
    try {
      await deleteFixedTransaction(ledgerId, item.fixedTransactionId);
      addToast('success', '固定費を削除しました');
      onSaved();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '削除に失敗しました';
      addToast('error', msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 py-8 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 my-auto">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">固定費を編集</h3>
        <FixedTransactionForm
          ledgerId={ledgerId}
          editing={item}
          beforeSaveConfirm={() =>
            window.confirm('関連する全ての明細が一括で更新されます。よろしいですか？')
          }
          onSaved={onSaved}
          onCancel={onClose}
        />
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={handleDelete}
            className="w-full border border-red-300 text-red-500 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
          >
            この固定費を削除する
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── FixedAddDialog ───────────────────────────────────────────────────────────

type AddDialogProps = {
  ledgerId: string;
  onClose: () => void;
  onSaved: () => void;
};

const FixedAddDialog = ({ ledgerId, onClose, onSaved }: AddDialogProps) => (
  <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 py-8 overflow-y-auto">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 my-auto">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">固定費を追加</h3>
      <FixedTransactionForm
        ledgerId={ledgerId}
        onSaved={onSaved}
        onCancel={onClose}
      />
    </div>
  </div>
);

// ─── FixedTransactionList ─────────────────────────────────────────────────────

const FixedTransactionList = ({ ledgerId }: Props) => {
  const [items, setItems] = useState<FixedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ALL');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedTransaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    try {
      const res = await getFixedTransactions(
        ledgerId,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setItems(res.data);
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [ledgerId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-4">
      {/* ツールバー */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['ALL', 'ACTIVE', 'EXPIRED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'ALL' ? '全て' : f === 'ACTIVE' ? '有効' : '期限切れ'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          + 追加
        </button>
      </div>

      {/* リスト */}
      {loading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState onRetry={load} />
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-400 text-sm">固定費が登録されていません</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((item) => (
            <button
              key={item.fixedTransactionId}
              onClick={() => setEditingItem(item)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {item.fixedName}
                    </span>
                    {item.isExpired && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded shrink-0">
                        期限切れ
                      </span>
                    )}
                  </div>
                  {item.memo && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-0.5">{item.memo}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {item.categoryIcon ? `${item.categoryIcon} ` : ''}
                      {item.categoryName}
                    </span>
                    <span
                      className={
                        item.transactionType === 'INCOME'
                          ? 'text-green-600 font-medium'
                          : 'text-red-500 font-medium'
                      }
                    >
                      {item.transactionType === 'INCOME' ? '+' : '-'}
                      {fmt(item.amount)}
                    </span>
                    <span>
                      {INTERVAL_TYPE_LABELS[item.intervalType]}
                      {['MONTHLY','BIMONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL'].includes(item.intervalType)
                        ? `${item.dayOfMonth}日` : ''}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {item.startDate} 〜 {item.endDate ?? '終了日なし'}
                  </div>
                </div>
                <span className="text-xs text-gray-300 dark:text-gray-600 shrink-0 mt-1">›</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 追加ダイアログ */}
      {showAddDialog && (
        <FixedAddDialog
          ledgerId={ledgerId}
          onClose={() => setShowAddDialog(false)}
          onSaved={() => { setShowAddDialog(false); load(); }}
        />
      )}

      {/* 編集ダイアログ */}
      {editingItem && (
        <FixedEditDialog
          ledgerId={ledgerId}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); load(); }}
        />
      )}
    </div>
  );
};

export default FixedTransactionList;
