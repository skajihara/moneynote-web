'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  type UserProfile,
} from '@/lib/api/user';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import { logout as logoutApi } from '@/lib/api/auth';

// ─── schemas ───────────────────────────────────────────────────────────────

const profileSchema = z.object({
  userName: z.string().min(1, 'ユーザー名を入力してください').max(50, 'ユーザー名は50文字以内で入力してください'),
  email: z.string().email('メールアドレスの形式が正しくありません').max(255, 'メールアドレスは255文字以内で入力してください'),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
    newPassword: z
      .string()
      .min(8, '8文字以上で入力してください')
      .regex(/[A-Z]/, '英大文字を1文字以上含めてください')
      .regex(/[a-z]/, '英小文字を1文字以上含めてください')
      .regex(/\d/, '数字を1文字以上含めてください')
      .regex(/[!@#$%^&*]/, '記号（!@#$%^&*）を1文字以上含めてください'),
    confirmPassword: z.string().min(1, '確認パスワードを入力してください'),
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingProfileData, setPendingProfileData] = useState<ProfileForm | null>(null);
  const [pendingPasswordData, setPendingPasswordData] = useState<PasswordForm | null>(null);

  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const newPasswordValue = passwordForm.watch('newPassword') || '';

  const passwordPolicies = [
    { label: '8文字以上', ok: newPasswordValue.length >= 8 },
    { label: '英大文字を含む', ok: /[A-Z]/.test(newPasswordValue) },
    { label: '英小文字を含む', ok: /[a-z]/.test(newPasswordValue) },
    { label: '数字を含む', ok: /\d/.test(newPasswordValue) },
    { label: '記号（!@#$%^&*）を含む', ok: /[!@#$%^&*]/.test(newPasswordValue) },
  ];

  useEffect(() => {
    getProfile()
      .then((res) => {
        setProfile(res.data);
        profileForm.reset({ userName: res.data.userName, email: res.data.email });
      })
      .catch(() => addToast('error', 'プロフィールの取得に失敗しました'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveProfile = profileForm.handleSubmit((data) => {
    setPendingProfileData(data);
  });

  const confirmSaveProfile = async () => {
    if (!pendingProfileData) return;
    const emailChanged = profile != null && pendingProfileData.email !== profile.email;
    try {
      const res = await updateProfile(pendingProfileData);
      setProfile(res.data);
      profileForm.reset({ userName: res.data.userName, email: res.data.email });
      if (emailChanged) {
        addToast('success', `確認メールを ${pendingProfileData.email} に送信しました。メール内のリンクをクリックするとアドレスが変更されます。`);
      } else {
        addToast('success', 'プロフィールを更新しました');
      }
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '更新に失敗しました';
      addToast('error', msg);
    } finally {
      setPendingProfileData(null);
    }
  };

  const onChangePassword = passwordForm.handleSubmit((data) => {
    setPendingPasswordData(data);
  });

  const confirmChangePassword = async () => {
    if (!pendingPasswordData) return;
    try {
      await changePassword({ currentPassword: pendingPasswordData.currentPassword, newPassword: pendingPasswordData.newPassword });
      passwordForm.reset();
      addToast('success', 'パスワードを変更しました');
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '変更に失敗しました';
      addToast('error', msg);
    } finally {
      setPendingPasswordData(null);
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

  // ─── confirmation messages for profile ────────────────────────────────────

  const profileConfirmMessages = (): string[] => {
    if (!pendingProfileData || !profile) return [];
    const msgs: string[] = [];
    if (pendingProfileData.userName !== profile.userName) {
      msgs.push(`ユーザー名を「${pendingProfileData.userName}」に変更します。`);
    }
    if (pendingProfileData.email !== profile.email) {
      msgs.push(`「${pendingProfileData.email}」に確認メールを送信します。メール内のリンクをクリックするとアドレスが変更されます。`);
    }
    return msgs;
  };

  return (
    <div className="space-y-8">
      {/* プロフィール */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">プロフィール</h2>
        <form onSubmit={onSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">ユーザー名</label>
            <input
              {...profileForm.register('userName')}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">50文字以内で入力してください</p>
            {profileForm.formState.errors.userName && (
              <p className="text-red-500 text-xs mt-1">{profileForm.formState.errors.userName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">メールアドレス</label>
            <input
              {...profileForm.register('email')}
              type="email"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] dark:bg-gray-700 dark:text-gray-100"
            />
            {profileForm.formState.errors.email && (
              <p className="text-red-500 text-xs mt-1">{profileForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">ユーザーID: {profile?.userId}</div>
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
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">パスワード変更</h2>
        <form onSubmit={onChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">現在のパスワード</label>
            <input
              {...passwordForm.register('currentPassword')}
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] dark:bg-gray-700 dark:text-gray-100"
            />
            {passwordForm.formState.errors.currentPassword && (
              <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">新しいパスワード</label>
            <input
              {...passwordForm.register('newPassword')}
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] dark:bg-gray-700 dark:text-gray-100"
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.newPassword.message}</p>
            )}
            {/* パスワードポリシー */}
            <ul className="mt-2 space-y-0.5">
              {passwordPolicies.map(({ label, ok }) => (
                <li key={label} className={`text-xs flex items-center gap-1 ${ok ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}>
                  {ok ? '✅' : '❌'} {label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-1">新しいパスワード（確認）</label>
            <input
              {...passwordForm.register('confirmPassword')}
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] dark:bg-gray-700 dark:text-gray-100"
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="btn-theme px-4 py-2 text-sm rounded-md"
          >
            変更
          </button>
        </form>
      </section>

      {/* アカウント削除 */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">アカウント削除</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          アカウントを削除すると、すべての帳簿・明細・予算データが完全に削除されます。この操作は取り消せません。
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 border border-red-400 text-red-500 text-sm rounded-md hover:bg-red-50"
        >
          アカウントを削除する
        </button>
      </section>

      {/* プロフィール変更確認ダイアログ */}
      {pendingProfileData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">変更の確認</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 mb-4 space-y-1">
              {profileConfirmMessages().map((msg, i) => (
                <li key={i} className="break-all">{msg}</li>
              ))}
              <li className="text-gray-500">よろしいですか？</li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingProfileData(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={confirmSaveProfile}
                className="btn-theme px-4 py-2 text-sm rounded-md"
              >
                変更する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* パスワード変更確認ダイアログ */}
      {pendingPasswordData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">パスワードを変更します。よろしいですか？</h3>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingPasswordData(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={confirmChangePassword}
                className="btn-theme px-4 py-2 text-sm rounded-md"
              >
                変更する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">本当に削除しますか？</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              本日深夜0時に削除されます。依頼後は当日中にキャンセルメールから取り消せます。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
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
