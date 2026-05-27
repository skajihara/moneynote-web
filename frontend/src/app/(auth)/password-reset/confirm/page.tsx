'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmPasswordReset } from '@/lib/api/auth';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import { Suspense } from 'react';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, '8文字以上')
      .regex(/[A-Z]/, '英大文字を1文字以上含めてください')
      .regex(/[a-z]/, '英小文字を1文字以上含めてください')
      .regex(/\d/, '数字を1文字以上含めてください')
      .regex(/[!@#$%^&*]/, '記号（!@#$%^&*）を1文字以上含めてください'),
    confirmPassword: z.string().min(1, '確認パスワードを入力してください'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

const PasswordResetConfirmForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const addToast = useToastStore((state) => state.add);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const newPasswordValue = watch('newPassword') || '';

  const passwordPolicies = [
    { label: '8文字以上', ok: newPasswordValue.length >= 8 },
    { label: '英大文字を含む', ok: /[A-Z]/.test(newPasswordValue) },
    { label: '英小文字を含む', ok: /[a-z]/.test(newPasswordValue) },
    { label: '数字を含む', ok: /\d/.test(newPasswordValue) },
    { label: '記号（!@#$%^&*）を含む', ok: /[!@#$%^&*]/.test(newPasswordValue) },
  ];

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      addToast('error', '無効なリセットリンクです');
      return;
    }
    try {
      await confirmPasswordReset(token, values.newPassword);
      addToast('success', 'パスワードをリセットしました。新しいパスワードでログインしてください。');
      router.push('/login');
    } catch (e) {
      const message =
        e instanceof ApiClientError
          ? e.error.message
          : 'パスワードのリセットに失敗しました';
      addToast('error', message);
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-6">新しいパスワードの設定</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            新しいパスワード
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
          )}
          <ul className="mt-2 space-y-0.5">
            {passwordPolicies.map(({ label, ok }) => (
              <li key={label} className={`text-xs flex items-center gap-1 ${ok ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}>
                {ok ? '✅' : '❌'} {label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            新しいパスワード（確認）
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
        >
          {isSubmitting ? '設定中...' : 'パスワードを設定する'}
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

const PasswordResetConfirmPage = () => {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</div>}>
      <PasswordResetConfirmForm />
    </Suspense>
  );
};

export default PasswordResetConfirmPage;
