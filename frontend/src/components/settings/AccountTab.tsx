'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getProfile,
  updateProfile,
  changePassword,
  updateTheme,
  deleteAccount,
  type UserProfile,
} from '@/lib/api/user';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import { logout as logoutApi } from '@/lib/api/auth';

// ─── schemas ───────────────────────────────────────────────────────────────

const profileSchema = z.object({
  userName: z.string().min(1, '必須').max(100),
  email: z.string().email('メールアドレスの形式が正しくありません').max(255),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '必須'),
    newPassword: z.string().min(8, '8文字以上').max(100),
    confirmPassword: z.string().min(1, '必須'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: '新しいパスワードが一致しません',
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

// ─── AccountTab ────────────────────────────────────────────────────────────

const AccountTab = () => {
  const addToast = useToastStore((s) => s.add);
  const authLogout = useAuthStore((s) => s.logout);
  const storeThemeColor = useAuthStore((s) => s.themeColor);
  const setStoreThemeColor = useAuthStore((s) => s.setThemeColor);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [themeColor, setThemeColor] = useState(storeThemeColor || '#4A90D9');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    getProfile()
      .then((res) => {
        setProfile(res.data);
        profileForm.reset({ userName: res.data.userName, email: res.data.email });
        const color = res.data.themeColor || '#4A90D9';
        setThemeColor(color);
        setStoreThemeColor(color);
      })
      .catch(() => addToast('error', 'プロフィールの取得に失敗しました'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveProfile = profileForm.handleSubmit(async (data) => {
    try {
      const res = await updateProfile(data);
      setProfile(res.data);
      addToast('success', 'プロフィールを更新しました');
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '更新に失敗しました';
      addToast('error', msg);
    }
  });

  const onChangePassword = passwordForm.handleSubmit(async (data) => {
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      passwordForm.reset();
      addToast('success', 'パスワードを変更しました');
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '変更に失敗しました';
      addToast('error', msg);
    }
  });

  const onSaveTheme = async () => {
    try {
      await updateTheme({ themeColor });
      setStoreThemeColor(themeColor);
      addToast('success', 'テーマカラーを保存しました');
    } catch {
      addToast('error', '保存に失敗しました');
    }
  };

  const onDeleteAccount = async () => {
    try {
      await logoutApi().catch(() => {});
      await deleteAccount();
      authLogout();
      window.location.href = '/login';
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '削除に失敗しました';
      addToast('error', msg);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* プロフィール */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">プロフィール</h2>
        <form onSubmit={onSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">ユーザー名</label>
            <input
              {...profileForm.register('userName')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)]"
            />
            {profileForm.formState.errors.userName && (
              <p className="text-red-500 text-xs mt-1">{profileForm.formState.errors.userName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">メールアドレス</label>
            <input
              {...profileForm.register('email')}
              type="email"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)]"
            />
            {profileForm.formState.errors.email && (
              <p className="text-red-500 text-xs mt-1">{profileForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="text-xs text-gray-400">ユーザーID: {profile?.userId}</div>
          <button
            type="submit"
            disabled={profileForm.formState.isSubmitting}
            className="btn-theme px-4 py-2 text-sm rounded-md"
          >
            保存
          </button>
        </form>
      </section>

      {/* パスワード変更 */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">パスワード変更</h2>
        <form onSubmit={onChangePassword} className="space-y-4">
          {(
            [
              ['currentPassword', '現在のパスワード'],
              ['newPassword', '新しいパスワード（8文字以上）'],
              ['confirmPassword', '新しいパスワード（確認）'],
            ] as const
          ).map(([name, label]) => (
            <div key={name}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input
                {...passwordForm.register(name)}
                type="password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)]"
              />
              {passwordForm.formState.errors[name] && (
                <p className="text-red-500 text-xs mt-1">
                  {passwordForm.formState.errors[name]?.message}
                </p>
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="btn-theme px-4 py-2 text-sm rounded-md"
          >
            変更
          </button>
        </form>
      </section>

      {/* テーマカラー */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">テーマカラー</h2>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={themeColor}
            onChange={(e) => {
              setThemeColor(e.target.value);
              setStoreThemeColor(e.target.value);
            }}
            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
          />
          <span className="text-sm text-gray-500">{themeColor}</span>
          <button
            onClick={onSaveTheme}
            className="btn-theme px-4 py-2 text-sm rounded-md"
          >
            保存
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">カラーピッカーで選択すると即プレビューされます</p>
      </section>

      {/* アカウント削除 */}
      <section className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-2">アカウント削除</h2>
        <p className="text-xs text-gray-500 mb-4">
          アカウントを削除すると、すべての帳簿・明細・予算データが完全に削除されます。この操作は取り消せません。
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 border border-red-400 text-red-500 text-sm rounded-md hover:bg-red-50"
        >
          アカウントを削除する
        </button>
      </section>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">本当に削除しますか？</h3>
            <p className="text-sm text-gray-500 mb-6">
              すべての帳簿・明細・予算データが完全に削除されます。この操作は取り消せません。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={onDeleteAccount}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountTab;
