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
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(/[a-zA-Z]/, 'パスワードには英字を1文字以上含めてください')
      .regex(/[0-9]/, 'パスワードには数字を1文字以上含めてください'),
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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

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
      <h2 className="text-xl font-semibold text-gray-700 mb-6">アカウント登録</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
            ユーザーID
          </label>
          <input
            id="userId"
            type="text"
            autoComplete="username"
            {...register('userId')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.userId && (
            <p className="mt-1 text-xs text-red-500">{errors.userId.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
            ユーザー名
          </label>
          <input
            id="userName"
            type="text"
            autoComplete="name"
            {...register('userName')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.userName && (
            <p className="mt-1 text-xs text-red-500">{errors.userName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            パスワード（確認）
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <Link href="/login" className="text-sm text-gray-500 hover:underline">
          すでにアカウントをお持ちの方はこちら
        </Link>
      </div>
    </>
  );
};

export default RegisterPage;
