'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FixedTransaction, CreateFixedTransactionRequest, IntervalType } from '@/types/fixed';
import { INTERVAL_TYPE_LABELS } from '@/types/fixed';
import type { TransactionType } from '@/types/transaction';
import type { Category } from '@/lib/api/ledger';
import { getCategories } from '@/lib/api/ledger';
import {
  createFixedTransaction,
  updateFixedTransaction,
} from '@/lib/api/fixed';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';

const INTERVAL_TYPES = Object.keys(INTERVAL_TYPE_LABELS) as IntervalType[];

/** dayOfMonth が意味を持つインターバル */
const USES_DAY_OF_MONTH: IntervalType[] = [
  'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL',
];

const schema = z.object({
  fixedName: z
    .string()
    .min(1, '名称を入力してください')
    .max(100, '名称は100文字以内で入力してください'),
  transactionType: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().min(1, 'カテゴリを選択してください'),
  amount: z
    .number({ invalid_type_error: '金額を入力してください' })
    .positive('金額は0より大きい値を入力してください'),
  dayOfMonth: z
    .number({ invalid_type_error: '日付を入力してください' })
    .int()
    .min(1, '1以上の値を入力してください')
    .max(28, '28以下の値を入力してください'),
  intervalType: z.enum([
    'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY',
    'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL',
  ]),
  startDate: z.string().min(1, '開始日を入力してください'),
  endDate: z.string().min(1, '終了日を入力してください'),
  memo: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
});

type FormValues = z.infer<typeof schema>;

/** 今日から10年後の日付を yyyy-MM-dd 形式で返す */
const defaultEndDate = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 10);
  return d.toISOString().slice(0, 10);
};

type Props = {
  ledgerId: string;
  editing?: FixedTransaction | null;
  /** 保存前に実行する確認。false を返すと保存をキャンセルする */
  beforeSaveConfirm?: () => boolean;
  onSaved: () => void;
  onCancel: () => void;
};

const FixedTransactionForm = ({ ledgerId, editing, beforeSaveConfirm, onSaved, onCancel }: Props) => {
  const addToast = useToastStore((s) => s.add);
  const [categories, setCategories] = useState<Category[]>([]);

  const defaultType: TransactionType = editing?.transactionType ?? 'EXPENSE';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fixedName: editing?.fixedName ?? '',
      transactionType: defaultType,
      categoryId: editing?.categoryId ?? '',
      amount: editing?.amount,
      dayOfMonth: editing?.dayOfMonth ?? 1,
      intervalType: editing?.intervalType ?? 'MONTHLY',
      startDate: editing?.startDate ?? '',
      endDate: editing?.endDate ?? defaultEndDate(),
      memo: editing?.memo ?? '',
    },
  });

  const currentType = watch('transactionType');
  const currentInterval = watch('intervalType');
  const showDayOfMonth = USES_DAY_OF_MONTH.includes(currentInterval);

  useEffect(() => {
    getCategories(ledgerId, currentType as 'INCOME' | 'EXPENSE').then((res) => {
      setCategories(res.data);
      if (editing) {
        setValue('categoryId', editing.categoryId);
      } else {
        setValue('categoryId', res.data[0]?.categoryId ?? '');
      }
    });
  }, [ledgerId, currentType, editing, setValue]);

  const onSubmit = async (values: FormValues) => {
    if (beforeSaveConfirm && !beforeSaveConfirm()) return;

    const payload: CreateFixedTransactionRequest = {
      fixedName: values.fixedName,
      transactionType: values.transactionType,
      categoryId: values.categoryId,
      amount: values.amount,
      dayOfMonth: values.dayOfMonth,
      intervalType: values.intervalType,
      startDate: values.startDate,
      endDate: values.endDate,
      memo: values.memo || null,
    };
    try {
      if (editing) {
        await updateFixedTransaction(ledgerId, editing.fixedTransactionId, payload);
        addToast('success', '固定費を更新しました');
      } else {
        await createFixedTransaction(ledgerId, payload);
        addToast('success', '固定費を登録しました');
      }
      onSaved();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '操作に失敗しました';
      addToast('error', msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* 名称 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
        <input
          {...register('fixedName')}
          type="text"
          placeholder="家賃、電気代..."
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        />
        {errors.fixedName && (
          <p className="text-red-500 text-xs mt-1">{errors.fixedName.message}</p>
        )}
      </div>

      {/* 種別切り替え */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">種別</label>
        <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
          {(['EXPENSE', 'INCOME'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('transactionType', t)}
              className={`flex-1 py-2 text-sm font-medium transition-colors
                ${currentType === t
                  ? t === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
              {t === 'EXPENSE' ? '支出' : '収入'}
            </button>
          ))}
        </div>
      </div>

      {/* カテゴリ */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">カテゴリ</label>
        <select
          {...register('categoryId')}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="">選択してください</option>
          {categories.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.icon ? `${c.icon} ` : ''}
              {c.categoryName}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
        )}
      </div>

      {/* 金額 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">金額</label>
        <input
          {...register('amount', { valueAsNumber: true })}
          type="number"
          min="1"
          placeholder="0"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        />
        {errors.amount && (
          <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
        )}
      </div>

      {/* 登録間隔 */}
      <div>
        <label htmlFor="intervalType" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">登録間隔</label>
        <select
          {...register('intervalType')}
          id="intervalType"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        >
          {INTERVAL_TYPES.map((it) => (
            <option key={it} value={it}>
              {INTERVAL_TYPE_LABELS[it]}
            </option>
          ))}
        </select>
        {errors.intervalType && (
          <p className="text-red-500 text-xs mt-1">{errors.intervalType.message}</p>
        )}
      </div>

      {/* 引落日（月単位インターバルのみ表示） */}
      {showDayOfMonth && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            引落日（毎月何日）
          </label>
          <input
            {...register('dayOfMonth', { valueAsNumber: true })}
            type="number"
            min="1"
            max="28"
            placeholder="1〜28"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
          {errors.dayOfMonth && (
            <p className="text-red-500 text-xs mt-1">{errors.dayOfMonth.message}</p>
          )}
        </div>
      )}

      {/* 開始日 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">開始日</label>
        <input
          {...register('startDate')}
          type="date"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        />
        {errors.startDate && (
          <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>
        )}
      </div>

      {/* 終了日 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">終了日</label>
        <input
          {...register('endDate')}
          type="date"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        />
        {errors.endDate && (
          <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>
        )}
      </div>

      {/* メモ */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">メモ（任意）</label>
        <textarea
          {...register('memo')}
          rows={2}
          placeholder="メモを入力..."
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-700 dark:text-gray-100"
        />
        {errors.memo && (
          <p className="text-red-500 text-xs mt-1">{errors.memo.message}</p>
        )}
      </div>

      {/* ボタン */}
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
          onClick={onCancel}
          className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
};

export default FixedTransactionForm;
