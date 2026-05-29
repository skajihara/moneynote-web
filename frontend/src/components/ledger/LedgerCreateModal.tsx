'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';

const schema = z.object({
  ledgerName: z.string().min(1, '帳簿名を入力してください').max(100, '帳簿名は100文字以内で入力してください'),
  initialBalance: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  /** モーダルを閉じるコールバック（帳簿作成成功時のみ呼ばれる） */
  onCreated: () => void;
};

const LedgerCreateModal = ({ onCreated }: Props) => {
  const { createLedger } = useLedgerStore();
  const addToast = useToastStore((state) => state.add);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const balance = values.initialBalance
        ? parseFloat(values.initialBalance)
        : undefined;
      await createLedger({
        ledgerName: values.ledgerName,
        initialBalance: balance,
      });
      addToast('success', '帳簿を作成しました');
      onCreated();
    } catch (e) {
      const msg =
        e instanceof ApiClientError ? e.error.message : '帳簿の作成に失敗しました';
      addToast('error', msg);
    }
  };

  return (
    // 背景オーバーレイ（キャンセル不可なのでクリックしても閉じない）
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">帳簿を作成する</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          MoneyNote Web を使うには帳簿が必要です。最初の帳簿を作成してください。
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 dark:text-gray-300 mb-1">
              帳簿名 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('ledgerName')}
              type="text"
              placeholder="例: 家計簿"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">100文字以内</p>
            {errors.ledgerName && (
              <p className="text-red-500 text-xs mt-1">{errors.ledgerName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 dark:text-gray-300 mb-1">
              初期残高（任意）
            </label>
            <input
              {...register('initialBalance')}
              type="number"
              placeholder="0"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '作成中...' : '帳簿を作成する'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LedgerCreateModal;
