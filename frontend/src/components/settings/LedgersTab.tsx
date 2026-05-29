'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { KeyboardSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  getLedgers,
  createLedger,
  updateLedger,
  deleteLedger,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryOrder,
  type Ledger,
  type Category,
} from '@/lib/api/ledger';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import LedgerMemberPanel from '@/components/settings/LedgerMemberPanel';

// ─── types ─────────────────────────────────────────────────────────────────

export type SubTab = 'info' | 'categories' | 'members' | 'delete';

// ─── schemas ───────────────────────────────────────────────────────────────

const ledgerSchema = z.object({
  ledgerName: z.string().min(1, '帳簿名を入力してください').max(100, '帳簿名は100文字以内で入力してください'),
  initialBalance: z.coerce.number().default(0),
  startDayOfMonth: z.coerce.number().min(1, '1〜28の範囲で入力してください').max(28, '1〜28の範囲で入力してください').default(1),
  startMonthOfYear: z.coerce.number().min(1, '1〜12の範囲で入力してください').max(12, '1〜12の範囲で入力してください').default(1),
  themeColor: z.string().max(30, 'テーマカラーが長すぎます').default('#4A90D9'),
});
type LedgerForm = z.infer<typeof ledgerSchema>;

const categorySchema = z.object({
  categoryName: z.string().min(1, 'カテゴリ名を入力してください').max(50, 'カテゴリ名は50文字以内で入力してください'),
  categoryType: z.enum(['INCOME', 'EXPENSE']),
});
type CategoryForm = z.infer<typeof categorySchema>;

// ─── SortableCategory ──────────────────────────────────────────────────────

type SortableCategoryProps = {
  category: Category;
  type: 'EXPENSE' | 'INCOME';
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
};

const SortableCategory = ({ category, type, onEdit, onDelete }: SortableCategoryProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.categoryId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const borderClass =
    type === 'EXPENSE'
      ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20'
      : 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between py-2 px-3 border rounded-md mb-1 ${borderClass}`}
    >
      <div className="flex items-center gap-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-300 hover:text-gray-500 select-none"
          aria-label="ドラッグして並び替え"
        >
          ⠿
        </span>
        <span className="text-sm text-gray-700 dark:text-gray-300">{category.categoryName}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(category)}
          className="text-xs text-theme hover:underline"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(category)}
          className="text-xs text-red-400 hover:underline"
        >
          削除
        </button>
      </div>
    </div>
  );
};

// ─── CategorySection ───────────────────────────────────────────────────────

type CategorySectionProps = {
  ledgerId: string;
  type: 'EXPENSE' | 'INCOME';
  label: string;
};

const CategorySection = ({ ledgerId, type, label }: CategorySectionProps) => {
  const addToast = useToastStore((s) => s.add);
  const [items, setItems] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const form = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    try {
      const res = await getCategories(ledgerId, type);
      setItems(res.data);
    } catch {
      addToast('error', 'カテゴリの取得に失敗しました');
    }
  }, [ledgerId, type, addToast]);

  useEffect(() => { load(); }, [load]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((c) => c.categoryId === active.id);
    const newIndex = items.findIndex((c) => c.categoryId === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    try {
      await updateCategoryOrder(
        ledgerId,
        reordered.map((c, i) => ({ categoryId: c.categoryId, displayOrder: i }))
      );
    } catch {
      addToast('error', '並び替えの保存に失敗しました');
      load();
    }
  };

  const startAdd = () => {
    setEditingId(null);
    form.reset({ categoryName: '', categoryType: type });
    setShowAdd(true);
  };

  const startEdit = (c: Category) => {
    setShowAdd(false);
    setEditingId(c.categoryId);
    form.reset({ categoryName: c.categoryName, categoryType: type });
  };

  const handleDelete = async (c: Category) => {
    if (!confirm(`「${c.categoryName}」を削除しますか？\n関連する明細のカテゴリが未設定になります。`)) return;
    try {
      await deleteCategory(ledgerId, c.categoryId);
      addToast('success', '削除しました');
      load();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '削除に失敗しました';
      addToast('error', msg);
    }
  };

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      if (editingId) {
        await updateCategory(ledgerId, editingId, { categoryName: data.categoryName });
        addToast('success', '更新しました');
        setEditingId(null);
      } else {
        await createCategory(ledgerId, { categoryName: data.categoryName, categoryType: type });
        addToast('success', '追加しました');
        setShowAdd(false);
      }
      load();
      form.reset();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '保存に失敗しました';
      addToast('error', msg);
    }
  });

  const headerClass =
    type === 'EXPENSE'
      ? 'text-red-600 font-semibold'
      : 'text-green-600 font-semibold';

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-xs uppercase tracking-wide ${headerClass}`}>{label}</h4>
        <button onClick={startAdd} className="text-xs text-theme hover:underline">+ 追加</button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((c) => c.categoryId)} strategy={verticalListSortingStrategy}>
          {items.map((c) => (
            editingId === c.categoryId ? (
              <form key={c.categoryId} onSubmit={onSubmit} className="flex gap-2 mb-1">
                <input
                  {...form.register('categoryName')}
                  className="flex-1 border border-[var(--theme-color)] rounded-md px-2 py-1 text-sm focus:outline-none dark:bg-gray-700 dark:text-gray-100"
                  autoFocus
                />
                <button type="submit" className="text-xs btn-theme px-3 py-1 rounded">保存</button>
                <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400 dark:text-gray-500 px-2">×</button>
              </form>
            ) : (
              <SortableCategory
                key={c.categoryId}
                category={c}
                type={type}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            )
          ))}
        </SortableContext>
      </DndContext>

      {showAdd && (
        <div className="mt-2">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              {...form.register('categoryName')}
              placeholder="カテゴリ名（50文字以内）"
              className="flex-1 border border-[var(--theme-color)] rounded-md px-2 py-1 text-sm focus:outline-none dark:bg-gray-700 dark:text-gray-100"
              autoFocus
            />
            <button type="submit" className="text-xs btn-theme px-3 py-1 rounded">追加</button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-gray-400 dark:text-gray-500 px-2">×</button>
          </form>
          {form.formState.errors.categoryName && (
            <p className="text-red-500 text-xs mt-1">{form.formState.errors.categoryName.message}</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── LedgerSettingsView ────────────────────────────────────────────────────

type LedgerSettingsViewProps = {
  ledger: Ledger;
  onBack: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  initialSubTab?: SubTab;
};

const SUB_TAB_CONFIG: { key: SubTab; label: string; isDelete?: boolean }[] = [
  { key: 'info',       label: '基本情報' },
  { key: 'categories', label: 'カテゴリ管理' },
  { key: 'members',    label: 'メンバー管理' },
  { key: 'delete',     label: '帳簿削除', isDelete: true },
];

const LedgerSettingsView = ({ ledger, onBack, onUpdated, onDeleted, initialSubTab = 'info' }: LedgerSettingsViewProps) => {
  const addToast = useToastStore((s) => s.add);
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab);

  const form = useForm<LedgerForm>({
    resolver: zodResolver(ledgerSchema),
    defaultValues: {
      ledgerName: ledger.ledgerName,
      initialBalance: ledger.initialBalance,
      startDayOfMonth: ledger.startDayOfMonth,
      startMonthOfYear: ledger.startMonthOfYear,
      themeColor: ledger.themeColor || '#4A90D9',
    },
  });

  const onSave = form.handleSubmit(async (data) => {
    try {
      await updateLedger(ledger.ledgerId, data);
      addToast('success', '帳簿を更新しました');
      onUpdated();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '更新に失敗しました';
      addToast('error', msg);
    }
  });

  const themeColorValue = form.watch('themeColor') || '#4A90D9';

  const handleDelete = async () => {
    if (!confirm('帳簿内の全データ（明細・予算・カテゴリ）が削除されます。よろしいですか？')) return;
    try {
      await deleteLedger(ledger.ledgerId);
      addToast('success', '帳簿を削除しました');
      onDeleted();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '削除に失敗しました';
      addToast('error', msg);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="text-sm text-theme hover:underline mb-3 block">
        ← 帳簿一覧
      </button>

      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4 break-words">{ledger.ledgerName}</h2>

      {/* サブタブ */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5 gap-0.5">
        {SUB_TAB_CONFIG.map(({ key, label, isDelete }) => {
          const isActive = subTab === key;
          const colorClass = isDelete ? 'text-red-500' : 'text-blue-600';
          const inactiveClass = isDelete
            ? 'border-transparent text-red-400 hover:text-red-500'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';
          return (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                isActive ? `border-current ${colorClass}` : inactiveClass
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 基本情報 */}
      {subTab === 'info' && (
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">帳簿名</label>
              <input
                {...form.register('ledgerName')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">100文字以内で入力してください</p>
              {form.formState.errors.ledgerName && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.ledgerName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">初期残高（円）</label>
              <input
                {...form.register('initialBalance')}
                type="number"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">月度開始日</label>
                <select
                  {...form.register('startDayOfMonth')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}日</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">年度開始月</label>
                <select
                  {...form.register('startMonthOfYear')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">テーマカラー</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColorValue}
                  onChange={(e) => form.setValue('themeColor', e.target.value)}
                  className="w-10 h-9 border border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">{themeColorValue}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">帳簿切り替え時にアプリ全体の色が変わります</p>
            </div>
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="btn-theme px-4 py-2 text-sm rounded-md"
            >
              保存
            </button>
          </form>
        </section>
      )}

      {/* カテゴリ管理 */}
      {subTab === 'categories' && (
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <CategorySection ledgerId={ledger.ledgerId} type="EXPENSE" label="支出カテゴリ" />
          <CategorySection ledgerId={ledger.ledgerId} type="INCOME" label="収入カテゴリ" />
        </section>
      )}

      {/* メンバー管理 */}
      {subTab === 'members' && (
        <LedgerMemberPanel ledgerId={ledger.ledgerId} />
      )}

      {/* 帳簿削除 */}
      {subTab === 'delete' && (
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-900 p-5">
          <h3 className="text-sm font-semibold text-red-500 dark:text-red-400 mb-2">帳簿の削除</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            帳簿内の全データ（明細・予算・カテゴリ）が削除されます。この操作は取り消せません。
          </p>
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-400 text-red-500 text-sm rounded-md hover:bg-red-50"
          >
            この帳簿を削除する
          </button>
        </section>
      )}
    </div>
  );
};

// ─── LedgerListView ────────────────────────────────────────────────────────

type LedgerListViewProps = {
  onSelect: (ledger: Ledger) => void;
};

const LedgerListView = ({ onSelect }: LedgerListViewProps) => {
  const addToast = useToastStore((s) => s.add);
  const storeCreate = useLedgerStore((s) => s.createLedger);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getLedgers();
      setLedgers(res.data);
    } catch {
      addToast('error', '帳簿一覧の取得に失敗しました');
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await storeCreate({ ledgerName: newName.trim() });
      setNewName('');
      setShowAddForm(false);
      load();
      addToast('success', '帳簿を作成しました');
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '作成に失敗しました';
      addToast('error', msg);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">帳簿一覧</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-theme px-3 py-1.5 text-sm rounded-md"
        >
          ＋ 新しい帳簿
        </button>
      </div>

      {showAddForm && (
        <div className="bg-theme-light border border-theme rounded-lg p-4 mb-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="帳簿名"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none dark:bg-gray-700 dark:text-gray-100"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <button onClick={handleCreate} className="btn-theme px-4 py-2 text-sm rounded-md">作成</button>
          <button onClick={() => setShowAddForm(false)} className="text-sm text-gray-400 dark:text-gray-500">×</button>
        </div>
      )}

      <div className="space-y-2">
        {ledgers.map((l) => (
          <button
            key={l.ledgerId}
            onClick={() => onSelect(l)}
            className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-[var(--theme-color)] hover:bg-theme-light transition-colors"
          >
            <div className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{l.ledgerName}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              初期残高: {l.initialBalance.toLocaleString('ja-JP')}円
              月度開始日: {l.startDayOfMonth}日
              作成日: {l.createdAt.slice(0, 10)}
            </div>
          </button>
        ))}
        {ledgers.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">帳簿がありません</p>
        )}
      </div>
    </div>
  );
};

// ─── LedgersTab ────────────────────────────────────────────────────────────

type LedgersTabProps = {
  openLedgerId?: string;
  initialSubTab?: SubTab;
};

const LedgersTab = ({ openLedgerId, initialSubTab }: LedgersTabProps) => {
  const { open: openPanel, close: closePanel } = useSubPanelStore();
  const fetchLedgers = useLedgerStore((s) => s.fetchLedgers);
  const storeLedgers = useLedgerStore((s) => s.ledgers);
  const autoOpenDone = useRef(false);

  const openSettings = useCallback((ledger: Ledger, subTab?: SubTab) => {
    openPanel(
      <LedgerSettingsView
        ledger={ledger}
        onBack={closePanel}
        onUpdated={() => { fetchLedgers(); }}
        onDeleted={() => { fetchLedgers(); closePanel(); }}
        initialSubTab={subTab}
      />
    );
  }, [openPanel, closePanel, fetchLedgers]);

  useEffect(() => {
    if (!openLedgerId || autoOpenDone.current) return;
    const ledger = storeLedgers.find((l) => l.ledgerId === openLedgerId);
    if (ledger) {
      autoOpenDone.current = true;
      openSettings(ledger, initialSubTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeLedgers]);

  return <LedgerListView onSelect={(l) => openSettings(l)} />;
};

export default LedgersTab;
