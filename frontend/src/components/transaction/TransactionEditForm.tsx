'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Transaction, TransactionType } from '@/types/transaction';
import type { Category } from '@/lib/api/ledger';
import { getCategories } from '@/lib/api/ledger';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/lib/api/transaction';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import FixedScopeDialog from './FixedScopeDialog';

const schema = z.object({
  transactionType: z.enum(['INCOME', 'EXPENSE']),
  transactionDate: z.string().min(1, '日付を入力してください'),
  amount: z
    .number({ invalid_type_error: '金額を入力してください' })
    .positive('金額は0より大きい値を入力してください'),
  categoryId: z.string().min(1, 'カテゴリを選択してください'),
  memo: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  ledgerId: string;
  initialDate?: string;
  transaction?: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
};

const TransactionEditForm = ({
  ledgerId,
  initialDate,
  transaction,
  onSuccess,
  onCancel,
}: Props) => {
  const addToast = useToastStore((state) => state.add);
  const isEdit = !!transaction;

  const [categories, setCategories] = useState<Category[]>([]);
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [scopeMode, setScopeMode] = useState<'edit' | 'delete'>('delete');
  // 保存確認ダイアログ表示前にフォームの値を一時保持する
  const pendingValuesRef = useRef<FormValues | null>(null);

  const defaultType: TransactionType = transaction?.transactionType ?? 'EXPENSE';
  // 初回カテゴリロード済みかどうかを追跡する（2回目以降は先頭カテゴリにリセット）
  const isInitialCategoryLoadRef = useRef(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      transactionType: defaultType,
      transactionDate: transaction?.transactionDate ?? initialDate ?? new Date().toISOString().slice(0, 10),
      amount: transaction?.amount,
      categoryId: transaction?.categoryId ?? '',
      memo: transaction?.memo ?? '',
    },
  });

  const currentType = watch('transactionType');

  // カテゴリ一覧を種別に応じて取得（state 更新のみ）
  useEffect(() => {
    getCategories(ledgerId, currentType).then((res) => {
      setCategories(res.data);
    });
  }, [ledgerId, currentType]);

  // categories state 更新（＝ option が DOM に描画）後に categoryId を設定する。
  // setCategories と setValue を同一フローで呼ぶと option が DOM に存在しない状態で
  // setValue が実行され select.value の反映に失敗するため、effect を分離している。
  useEffect(() => {
    if (categories.length === 0) return;
    if (isInitialCategoryLoadRef.current) {
      // 初回ロード: 編集時のみ既存 categoryId を復元する。
      // 新規作成時は defaultValues の '' のまま「選択してください」を表示し続ける。
      if (isEdit) {
        setValue('categoryId', transaction?.categoryId ?? '');
      }
      isInitialCategoryLoadRef.current = false;
    } else {
      // 種別切り替え: 先頭カテゴリをセット
      setValue('categoryId', categories[0]?.categoryId ?? '');
    }
    // categories, isEdit, transaction?.categoryId は安定しており eslint-disable で除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const execSave = async (values: FormValues) => {
    const payload = {
      transactionType: values.transactionType,
      amount: values.amount,
      transactionDate: values.transactionDate,
      categoryId: values.categoryId,
      memo: values.memo || undefined,
    };
    try {
      if (isEdit) {
        await updateTransaction(ledgerId, transaction.transactionId, payload);
        addToast('success', '明細を更新しました');
      } else {
        await createTransaction(ledgerId, payload);
        addToast('success', '明細を追加しました');
      }
      onSuccess();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '操作に失敗しました';
      addToast('error', msg);
    }
  };

  const onSubmit = async (values: FormValues) => {
    // 固定費由来の明細を編集する場合はダイアログで確認
    if (isEdit && transaction?.isFixedOrigin) {
      pendingValuesRef.current = values;
      setScopeMode('edit');
      setShowScopeDialog(true);
      return;
    }
    await execSave(values);
  };

  const execDelete = async () => {
    if (!transaction) return;
    try {
      await deleteTransaction(ledgerId, transaction.transactionId, 'SINGLE');
      addToast('success', '明細を削除しました');
      onSuccess();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '削除に失敗しました';
      addToast('error', msg);
    }
  };

  const handleDelete = () => {
    if (transaction?.isFixedOrigin) {
      setScopeMode('delete');
      setShowScopeDialog(true);
    } else {
      execDelete();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* ヘッダー: タイトルと × ボタン */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">
            {isEdit ? '明細を編集' : '明細を追加'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="閉じる"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1 rounded hover:bg-gray-100 transition-colors"
          >
            ×
          </button>
        </div>

        {/* 種別切り替え */}
        <div className="flex rounded-md overflow-hidden border border-gray-300">
          {(['EXPENSE', 'INCOME'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('transactionType', t)}
              className={`flex-1 py-2 text-sm font-medium transition-colors
                ${currentType === t
                  ? t === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {t === 'EXPENSE' ? '支出' : '収入'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {/* 日付 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">日付</label>
            <input
              {...register('transactionDate')}
              type="date"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.transactionDate && (
              <p className="text-red-500 text-xs mt-1">{errors.transactionDate.message}</p>
            )}
          </div>

          {/* 金額 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">金額</label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              min="1"
              placeholder="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">カテゴリ</label>
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
            {errors.categoryId && (
              <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
            )}
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">メモ（任意）</label>
            <textarea
              {...register('memo')}
              rows={2}
              placeholder="メモを入力..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {errors.memo && (
              <p className="text-red-500 text-xs mt-1">{errors.memo.message}</p>
            )}
          </div>

          {/* ボタン */}
          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>

          {/* 削除ボタン（編集時のみ表示） */}
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full text-red-500 border border-red-200 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors mt-1"
            >
              削除
            </button>
          )}
        </form>
      </div>

      {/* 固定費スコープ選択ダイアログ */}
      {showScopeDialog && (
        <FixedScopeDialog
          mode={scopeMode}
          onConfirm={() => {
            setShowScopeDialog(false);
            if (scopeMode === 'edit' && pendingValuesRef.current) {
              execSave(pendingValuesRef.current);
              pendingValuesRef.current = null;
            } else {
              execDelete();
            }
          }}
          onCancel={() => {
            setShowScopeDialog(false);
            pendingValuesRef.current = null;
          }}
        />
      )}
    </>
  );
};

export default TransactionEditForm;
