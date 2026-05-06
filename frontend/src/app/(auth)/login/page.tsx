'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';

const schema = z.object({
  userId: z.string().min(3, 'ユーザーIDは3文字以上で入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

type FormValues = z.infer<typeof schema>;

const LoginPage = () => {
  const router = useRouter();
  const authLogin = useAuthStore((state) => state.login);
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
      const result = await login(values);
      authLogin(values.userId, values.userId, result.data.accessToken);
      router.push('/dashboard');
    } catch (e) {
      const message =
        e instanceof ApiClientError
          ? e.error.message
          : 'ログインに失敗しました';
      addToast('error', message);
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-6">ログイン</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-200 dark:text-gray-300 mb-1">
            ユーザーID
          </label>
          <input
            id="userId"
            type="text"
            autoComplete="username"
            {...register('userId')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
          {errors.userId && (
            <p className="mt-1 text-xs text-red-500">{errors.userId.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 dark:text-gray-300 mb-1">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
        >
          {isSubmitting ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <Link href="/password-reset" className="text-sm text-blue-600 hover:underline block">
          パスワードをお忘れの方
        </Link>
        <Link href="/register" className="text-sm text-gray-500 dark:text-gray-400 hover:underline block">
          アカウントをお持ちでない方はこちら
        </Link>
      </div>
    </>
  );
};

export default LoginPage;
