'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import type { Budget, BudgetHeatmapMonth } from '@/types/budget';
import type { Category } from '@/lib/api/ledger';
import { getCategories } from '@/lib/api/ledger';
import { getBudgets, getBudgetHeatmap, upsertBudget, deleteBudget } from '@/lib/api/budget';
import { getCurrentYearMonth } from '@/lib/periodUtils';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const getPastMonths = (n: number): { year: number; month: number }[] => {
  const result = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    result.push({ year: t.getFullYear(), month: t.getMonth() + 1 });
  }
  return result;
};

// ─── form schema ─────────────────────────────────────────────────────────────

const schema = z.object({
  categoryId: z.string().min(1, 'カテゴリを選択してください'),
  amount: z
    .number({ invalid_type_error: '金額を入力してください' })
    .positive('金額は0より大きい値を入力してください'),
});
type FormValues = z.infer<typeof schema>;

// ─── BudgetAddModal ───────────────────────────────────────────────────────────

type AddModalProps = {
  ledgerId: string;
  year: number;
  month: number;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

const BudgetAddModal = ({ ledgerId, year, month, categories, onClose, onSaved }: AddModalProps) => {
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
      <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">予算を追加</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
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

// ─── BudgetEditDialog ─────────────────────────────────────────────────────────

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

const BudgetEditDialog = ({ ledgerId, year, month, budget, onClose, onSaved }: EditDialogProps) => {
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
      <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">予算を編集</h3>
        <p className="text-xs text-gray-500 mb-3">
          {budget.categoryIcon ? `${budget.categoryIcon} ` : ''}{budget.categoryName}
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
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
  const barColor = isOver ? 'bg-red-500' : b.status === 'WARNING' ? 'bg-yellow-400' : 'bg-green-500';

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-800">
          {b.categoryIcon ? `${b.categoryIcon} ` : ''}{b.categoryName}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isOver ? 'bg-red-100 text-red-600' : b.status === 'WARNING' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-700'
        }`}>
          {isOver ? '超過' : b.status === 'WARNING' ? '注意' : '正常'}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className={`flex-1 rounded-full h-1.5 overflow-hidden ${isOver ? 'bg-red-100' : 'bg-gray-100'}`}>
          <div className={`h-1.5 rounded-full ${barColor} ${isOver ? 'animate-pulse' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs w-12 text-right font-medium ${isOver ? 'text-red-500' : 'text-gray-500'}`}>
          {b.percentage.toFixed(1)}%
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>実績: <span className="text-red-500 font-medium">{fmt(b.actualAmount)}</span></span>
        <span>
          {isOver
            ? <span className="text-red-500 font-medium">{fmt(overAmount)} 超過</span>
            : <>残り: <span className="text-green-600 font-medium">{fmt(b.remainingAmount)}</span></>}
          {' '}/ 予算: {fmt(b.budgetAmount)}
        </span>
      </div>
    </button>
  );
};

// ─── 予算達成率ヒートマップ ──────────────────────────────────────────────────

const HEATMAP_MONTHS = 12;

const cellColor = (pct: number | null): string => {
  if (pct === null) return 'bg-gray-100 text-gray-400';
  if (pct >= 100) return 'bg-red-400 text-white';
  if (pct >= 80)  return 'bg-yellow-300 text-yellow-900';
  return 'bg-green-300 text-green-900';
};

const BudgetHeatmap = ({ ledgerId }: { ledgerId: string }) => {
  const [data, setData] = useState<BudgetHeatmapMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBudgetHeatmap(ledgerId, HEATMAP_MONTHS).then((r) => {
      setData(r.data);
      setLoading(false);
    });
  }, [ledgerId]);

  if (loading) return <div className="text-xs text-gray-400 py-4 text-center">読み込み中...</div>;

  const categoryNames = Array.from(
    new Set(data.flatMap((d) => d.budgets.map((b) => b.categoryName)))
  );

  if (categoryNames.length === 0) {
    return <p className="text-xs text-gray-400 py-2">予算データがありません</p>;
  }

  const displayData = [...data].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse min-w-full">
        <thead>
          <tr>
            <th className="text-left pr-2 py-1 text-gray-500 font-medium whitespace-nowrap">カテゴリ</th>
            {displayData.map((d) => (
              <th key={d.yearMonth} className="px-1 py-1 text-gray-500 font-medium text-center whitespace-nowrap">
                {d.yearMonth.slice(5)}月
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categoryNames.map((name) => (
            <tr key={name}>
              <td className="pr-2 py-0.5 text-gray-700 whitespace-nowrap">{name}</td>
              {displayData.map((d) => {
                const b = d.budgets.find((bgt) => bgt.categoryName === name);
                const pct = b ? b.percentage : null;
                return (
                  <td key={d.yearMonth} className="px-0.5 py-0.5">
                    <div
                      className={`rounded text-center px-1 py-0.5 text-xs font-medium ${cellColor(pct)}`}
                      title={pct !== null ? `${pct.toFixed(1)}%` : '未設定'}
                    >
                      {pct !== null ? `${Math.round(pct)}%` : '−'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-300 inline-block" />80%未満</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300 inline-block" />80〜99%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />100%以上</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" />未設定</span>
      </div>
    </div>
  );
};

// ─── 予算余剰・超過グラフ ────────────────────────────────────────────────────

const SURPLUS_MONTHS = 6;

type SurplusItem = { label: string; surplus: number };

const BudgetSurplusChart = ({ ledgerId }: { ledgerId: string }) => {
  const [items, setItems] = useState<SurplusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const months = getPastMonths(SURPLUS_MONTHS);
    Promise.all(months.map((m) => getBudgets(ledgerId, m.year, m.month)
      .then((r) => ({ ...m, budgets: r.data }))
    )).then((results) => {
      const data: SurplusItem[] = results.map((r) => ({
        label: `${r.month}月`,
        surplus: r.budgets.reduce((s, b) => s + b.budgetAmount, 0)
               - r.budgets.reduce((s, b) => s + b.actualAmount, 0),
      }));
      setItems(data);
      setLoading(false);
    });
  }, [ledgerId]);

  if (loading) return <div className="text-xs text-gray-400 py-4 text-center">読み込み中...</div>;

  const hasData = items.some((d) => d.surplus !== 0);
  if (!hasData) return <p className="text-xs text-gray-400 py-2">予算データがありません</p>;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={items} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 16 }} />
        <YAxis
          tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
          tick={{ fontSize: 16 }}
          width={36}
        />
        <Tooltip formatter={(v: number) => [fmt(v), v >= 0 ? '余剰' : '超過']} />
        <Bar dataKey="surplus" name="余剰/超過" radius={[2, 2, 0, 0]}>
          {items.map((d, i) => (
            <Cell key={i} fill={d.surplus >= 0 ? '#16A34A' : '#EF4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ─── BudgetPanel ─────────────────────────────────────────────────────────────

type BudgetPanelProps = {
  ledgerId: string;
};

const BudgetPanel = ({ ledgerId }: BudgetPanelProps) => {
  const getSelectedLedger = useLedgerStore((s) => s.getSelectedLedger);
  const startDayOfMonth = getSelectedLedger()?.startDayOfMonth ?? 1;
  const { year: initYear, month: initMonth } = getCurrentYearMonth(startDayOfMonth);
  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState(initMonth);
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
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">予算管理</h2>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={availableCategories.length === 0}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + 予算を追加
        </button>
      </div>

      {/* 月選択 */}
      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 self-start">
        <button onClick={handlePrevMonth} className="text-gray-500 hover:text-gray-700 px-1" aria-label="前月">◀</button>
        <span className="text-sm font-semibold text-gray-800 w-20 text-center">{year}年{month}月</span>
        <button onClick={handleNextMonth} className="text-gray-500 hover:text-gray-700 px-1" aria-label="翌月">▶</button>
      </div>

      {/* サマリ */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '予算合計', val: totalBudget, color: 'text-gray-800' },
            { label: '実績合計', val: totalActual, color: 'text-red-500' },
            { label: '残り合計', val: totalBudget - totalActual, color: totalBudget - totalActual >= 0 ? 'text-green-600' : 'text-red-500' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className={`text-base font-bold ${color}`}>{fmt(val)}</p>
            </div>
          ))}
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
            <BudgetRow key={b.budgetId} budget={b} onClick={() => setEditingBudget(b)} />
          ))}
        </div>
      )}

      {/* 予算達成率ヒートマップ（過去12ヶ月） */}
      <section className="bg-white rounded-lg border border-gray-200 p-3">
        <h3 className="text-base font-semibold text-gray-700 mb-3">予算達成率ヒートマップ（過去12ヶ月）</h3>
        <BudgetHeatmap ledgerId={ledgerId} />
      </section>

      {/* 予算余剰・超過グラフ（直近6ヶ月） */}
      <section className="bg-white rounded-lg border border-gray-200 p-3">
        <h3 className="text-base font-semibold text-gray-700 mb-2">予算余剰・超過（直近6ヶ月）</h3>
        <p className="text-xs text-gray-400 mb-2">緑: 余剰（予算内）　赤: 超過（予算超え）</p>
        <BudgetSurplusChart ledgerId={ledgerId} />
      </section>

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

export default BudgetPanel;
