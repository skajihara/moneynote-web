'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { requestPasswordReset } from '@/lib/api/auth';
import { useToastStore } from '@/stores/toastStore';

const schema = z.object({
  email: z.string().min(1, 'メールアドレスを入力してください').email('有効なメールアドレスを入力してください'),
});

type FormValues = z.infer<typeof schema>;

const PasswordResetPage = () => {
  const [sent, setSent] = useState(false);
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
      await requestPasswordReset(values.email);
      setSent(true);
    } catch {
      // セキュリティ上、エラーでも成功扱いにする（ユーザー列挙攻撃対策）
      setSent(true);
    }
  };

  if (sent) {
    return (
      <>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">メールを送信しました</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          パスワードリセット用のメールを送信しました。メールをご確認ください。
        </p>
        <Link
          href="/login"
          className="block text-center text-sm text-blue-600 hover:underline"
        >
          ログイン画面に戻る
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">パスワードのリセット</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
        >
          {isSubmitting ? '送信中...' : 'リセットメールを送信'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
          ログイン画面に戻る
        </Link>
      </div>
    </>
  );
};

export default PasswordResetPage;
