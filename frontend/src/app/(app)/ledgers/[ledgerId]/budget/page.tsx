'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Budget } from '@/types/budget';
import type { Category } from '@/lib/api/ledger';
import { getCategories } from '@/lib/api/ledger';
import { getBudgets, upsertBudget, deleteBudget } from '@/lib/api/budget';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

// ─── form schema ─────────────────────────────────────────────────────────────

const schema = z.object({
  categoryId: z.string().min(1, 'カテゴリを選択してください'),
  amount: z
    .number({ invalid_type_error: '金額を入力してください' })
    .positive('金額は0より大きい値を入力してください'),
});
type FormValues = z.infer<typeof schema>;

// ─── BudgetFormModal (新規追加) ───────────────────────────────────────────────

type AddModalProps = {
  ledgerId: string;
  year: number;
  month: number;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

const BudgetAddModal = ({
  ledgerId, year, month, categories, onClose, onSaved,
}: AddModalProps) => {
  const addToast = useToastStore((s) => s.add);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: '', amount: undefined },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await upsertBudget(ledgerId, { categoryId: values.categoryId, year, month, amount: values.amount });
      addToast('success', '予算を登録しました');
      onSaved();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '操作に失敗しました';
      addToast('error', msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-gray-800 mb-4">予算を追加</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">カテゴリ（支出）</label>
            <select
              {...register('categoryId')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.icon ? `${c.icon} ` : ''}{c.categoryName}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">予算金額</label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              min="1"
              placeholder="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── BudgetEditDialog (行クリック時: 金額編集 + 削除) ─────────────────────────

type EditDialogProps = {
  ledgerId: string;
  year: number;
  month: number;
  budget: Budget;
  onClose: () => void;
  onSaved: () => void;
};

const editSchema = z.object({
  amount: z
    .number({ invalid_type_error: '金額を入力してください' })
    .positive('金額は0より大きい値を入力してください'),
});
type EditFormValues = z.infer<typeof editSchema>;

const BudgetEditDialog = ({
  ledgerId, year, month, budget, onClose, onSaved,
}: EditDialogProps) => {
  const addToast = useToastStore((s) => s.add);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { amount: budget.budgetAmount },
  });

  const onSubmit = async (values: EditFormValues) => {
    try {
      await upsertBudget(ledgerId, {
        categoryId: budget.categoryId,
        year,
        month,
        amount: values.amount,
      });
      addToast('success', '予算を更新しました');
      onSaved();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '操作に失敗しました';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`「${budget.categoryName}」の予算を削除しますか？`)) return;
    try {
      await deleteBudget(ledgerId, budget.budgetId);
      addToast('success', '予算を削除しました');
      onSaved();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '削除に失敗しました';
      addToast('error', msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-gray-800 mb-1">予算を編集</h3>
        <p className="text-sm text-gray-500 mb-4">
          {budget.categoryIcon ? `${budget.categoryIcon} ` : ''}{budget.categoryName}
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">予算金額</label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              min="1"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '保存中...' : '更新'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="w-full border border-red-300 text-red-500 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
          >
            この予算を削除
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── BudgetRow ────────────────────────────────────────────────────────────────

type BudgetRowProps = {
  budget: Budget;
  onClick: () => void;
};

const BudgetRow = ({ budget: b, onClick }: BudgetRowProps) => {
  const isOver = b.status === 'OVER';
  const pct = Math.min(b.percentage, 100);
  const overAmount = b.actualAmount - b.budgetAmount;

  const barColor = isOver
    ? 'bg-red-500'
    : b.status === 'WARNING'
    ? 'bg-yellow-400'
    : 'bg-green-500';

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">
          {b.categoryIcon ? `${b.categoryIcon} ` : ''}{b.categoryName}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isOver
              ? 'bg-red-100 text-red-600'
              : b.status === 'WARNING'
              ? 'bg-yellow-100 text-yellow-600'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {isOver ? '超過' : b.status === 'WARNING' ? '注意' : '正常'}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="relative flex items-center gap-2 mb-1">
        <div className={`flex-1 rounded-full h-2 overflow-hidden ${isOver ? 'bg-red-100' : 'bg-gray-100'}`}>
          <div
            className={`h-2 rounded-full transition-all ${barColor} ${isOver ? 'animate-pulse' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs w-14 text-right font-medium ${isOver ? 'text-red-500' : 'text-gray-500'}`}>
          {b.percentage.toFixed(1)}%
        </span>
      </div>

      {/* 金額情報 */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          実績: <span className="text-red-500 font-medium">{fmt(b.actualAmount)}</span>
        </span>
        <span>
          {isOver ? (
            <span className="text-red-500 font-medium">{fmt(overAmount)} 超過</span>
          ) : (
            <>
              残り:{' '}
              <span className="text-green-600 font-medium">{fmt(b.remainingAmount)}</span>
            </>
          )}
          {' '}/ 予算: {fmt(b.budgetAmount)}
        </span>
      </div>
    </button>
  );
};

// ─── BudgetPage ───────────────────────────────────────────────────────────────

const BudgetPage = () => {
  const { ledgerId } = useParams<{ ledgerId: string }>();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expCategories, setExpCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBudgets(ledgerId, year, month);
      setBudgets(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [ledgerId, year, month]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getCategories(ledgerId, 'EXPENSE').then((res) => setExpCategories(res.data));
  }, [ledgerId]);

  const handlePrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else { setMonth((m) => m - 1); }
  };
  const handleNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else { setMonth((m) => m + 1); }
  };

  const registeredIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = expCategories.filter((c) => !registeredIds.has(c.categoryId));

  const totalBudget = budgets.reduce((s, b) => s + b.budgetAmount, 0);
  const totalActual = budgets.reduce((s, b) => s + b.actualAmount, 0);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">予算管理</h1>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={availableCategories.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + 予算を追加
        </button>
      </div>

      {/* 月選択 */}
      <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3 self-start">
        <button onClick={handlePrevMonth} className="text-gray-500 hover:text-gray-700 px-1" aria-label="前月">◀</button>
        <span className="text-base font-semibold text-gray-800 w-24 text-center">{year}年{month}月</span>
        <button onClick={handleNextMonth} className="text-gray-500 hover:text-gray-700 px-1" aria-label="翌月">▶</button>
      </div>

      {/* サマリ */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">予算合計</p>
            <p className="text-base font-bold text-gray-800">{fmt(totalBudget)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">実績合計</p>
            <p className="text-base font-bold text-red-500">{fmt(totalActual)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">残り合計</p>
            <p className={`text-base font-bold ${totalBudget - totalActual >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {fmt(totalBudget - totalActual)}
            </p>
          </div>
        </div>
      )}

      {/* 予算リスト */}
      {loading ? (
        <div className="text-center text-gray-400 py-8 text-sm">読み込み中...</div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">この月の予算がまだ設定されていません</p>
          <p className="text-gray-300 text-xs mt-1">「予算を追加」ボタンから設定してください</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {budgets.map((b) => (
            <BudgetRow
              key={b.budgetId}
              budget={b}
              onClick={() => setEditingBudget(b)}
            />
          ))}
        </div>
      )}

      {/* 新規追加モーダル */}
      {showAddModal && (
        <BudgetAddModal
          ledgerId={ledgerId}
          year={year}
          month={month}
          categories={availableCategories}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); load(); }}
        />
      )}

      {/* 行クリック編集ダイアログ */}
      {editingBudget && (
        <BudgetEditDialog
          ledgerId={ledgerId}
          year={year}
          month={month}
          budget={editingBudget}
          onClose={() => setEditingBudget(null)}
          onSaved={() => { setEditingBudget(null); load(); }}
        />
      )}
    </div>
  );
};

export default BudgetPage;
