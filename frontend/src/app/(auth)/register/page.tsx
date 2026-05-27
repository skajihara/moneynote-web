'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register as registerApi } from '@/lib/api/auth';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';

const schema = z
  .object({
    userId: z
      .string()
      .min(3, 'ユーザーIDは3文字以上で入力してください')
      .max(20, 'ユーザーIDは20文字以下で入力してください')
      .regex(/^[a-zA-Z0-9_]+$/, 'ユーザーIDは半角英数字とアンダーバーのみ使用できます'),
    userName: z
      .string()
      .min(1, 'ユーザー名を入力してください')
      .max(50, 'ユーザー名は50文字以下で入力してください'),
    email: z.string().min(1, 'メールアドレスを入力してください').email('有効なメールアドレスを入力してください'),
    password: z
      .string()
      .min(8, '8文字以上')
      .regex(/[A-Z]/, '英大文字を1文字以上含めてください')
      .regex(/[a-z]/, '英小文字を1文字以上含めてください')
      .regex(/\d/, '数字を1文字以上含めてください')
      .regex(/[!@#$%^&*]/, '記号（!@#$%^&*）を1文字以上含めてください'),
    confirmPassword: z.string().min(1, '確認パスワードを入力してください'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

const RegisterPage = () => {
  const router = useRouter();
  const addToast = useToastStore((state) => state.add);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const passwordValue = watch('password') || '';

  const passwordPolicies = [
    { label: '8文字以上', ok: passwordValue.length >= 8 },
    { label: '英大文字を含む', ok: /[A-Z]/.test(passwordValue) },
    { label: '英小文字を含む', ok: /[a-z]/.test(passwordValue) },
    { label: '数字を含む', ok: /\d/.test(passwordValue) },
    { label: '記号（!@#$%^&*）を含む', ok: /[!@#$%^&*]/.test(passwordValue) },
  ];

  const onSubmit = async (values: FormValues) => {
    try {
      await registerApi({
        userId: values.userId,
        userName: values.userName,
        email: values.email,
        password: values.password,
      });
      addToast('success', 'アカウントを作成しました。ログインしてください。');
      router.push('/login');
    } catch (e) {
      const message =
        e instanceof ApiClientError
          ? e.error.message
          : '登録に失敗しました';
      addToast('error', message);
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-6">アカウント登録</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ユーザー名
          </label>
          <input
            id="userName"
            type="text"
            autoComplete="name"
            {...register('userName')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
          {errors.userName && (
            <p className="mt-1 text-xs text-red-500">{errors.userName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
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
            パスワード（確認）
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors mt-2"
        >
          {isSubmitting ? '登録中...' : 'アカウントを作成'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
          すでにアカウントをお持ちの方はこちら
        </Link>
      </div>
    </>
  );
};

export default RegisterPage;
