'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import {
  listAdminUsers,
  createAdminUser,
  changeUserRole,
  activateUser,
  deactivateUser,
  deleteAdminUser,
  type AdminUser,
} from '@/lib/api/admin';

// ─── フォームスキーマ ─────────────────────────────────────────
const createSchema = z.object({
  userId: z
    .string()
    .min(3, 'ユーザーIDは3文字以上')
    .max(20, 'ユーザーIDは20文字以下')
    .regex(/^[a-zA-Z0-9_]+$/, '半角英数字とアンダースコアのみ'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/,
      '大文字・小文字・数字・記号(!@#$%^&*)をそれぞれ含む必要があります'
    ),
  role: z.enum(['USER', 'SYSTEM_ADMIN']),
});

type CreateFormValues = z.infer<typeof createSchema>;

// ─── 確認ダイアログ型 ─────────────────────────────────────────
type ConfirmDialog = {
  title: string;
  message: string;
  onConfirm: () => void;
};

// ─── フィルター型 ─────────────────────────────────────────────
type FilterRole = 'ALL' | 'USER' | 'SYSTEM_ADMIN';
type FilterActive = 'ALL' | 'ACTIVE' | 'INACTIVE';

// ─── メインコンポーネント ─────────────────────────────────────
const AdminPage = () => {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const addToast = useToastStore((s) => s.add);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);
  const [filterRole, setFilterRole] = useState<FilterRole>('ALL');
  const [filterActive, setFilterActive] = useState<FilterActive>('ALL');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateFormValues>({ resolver: zodResolver(createSchema) });

  // 一般ユーザーはダッシュボードへリダイレクト
  useEffect(() => {
    if (role !== null && role !== 'SYSTEM_ADMIN') {
      router.replace('/dashboard');
    }
  }, [role, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await listAdminUsers();
      setUsers(res.data);
    } catch {
      addToast('error', 'ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (role === 'SYSTEM_ADMIN') fetchUsers();
  }, [role, fetchUsers]);

  // ─── 操作ハンドラー ─────────────────────────────────────────

  const handleCreate = async (values: CreateFormValues) => {
    try {
      await createAdminUser(values);
      addToast('success', `ユーザー "${values.userId}" を作成しました`);
      reset();
      setShowCreateForm(false);
      fetchUsers();
    } catch (e) {
      addToast('error', e instanceof ApiClientError ? e.error.message : '作成に失敗しました');
    }
  };

  const handleChangeRole = (user: AdminUser) => {
    const newRole = user.role === 'SYSTEM_ADMIN' ? 'USER' : 'SYSTEM_ADMIN';
    setConfirm({
      title: 'ロール変更',
      message: `"${user.userId}" のロールを ${newRole} に変更しますか？`,
      onConfirm: async () => {
        try {
          await changeUserRole(user.userId, { role: newRole });
          addToast('success', 'ロールを変更しました');
          fetchUsers();
        } catch (e) {
          addToast('error', e instanceof ApiClientError ? e.error.message : 'ロール変更に失敗しました');
        }
        setConfirm(null);
      },
    });
  };

  const handleDeactivate = (user: AdminUser) => {
    setConfirm({
      title: 'アカウント無効化',
      message: `"${user.userId}" を無効化しますか？ログインできなくなります。`,
      onConfirm: async () => {
        try {
          await deactivateUser(user.userId);
          addToast('success', 'アカウントを無効化しました');
          fetchUsers();
        } catch (e) {
          addToast('error', e instanceof ApiClientError ? e.error.message : '無効化に失敗しました');
        }
        setConfirm(null);
      },
    });
  };

  const handleActivate = (user: AdminUser) => {
    setConfirm({
      title: 'アカウント有効化',
      message: `"${user.userId}" を有効化しますか？`,
      onConfirm: async () => {
        try {
          await activateUser(user.userId);
          addToast('success', 'アカウントを有効化しました');
          fetchUsers();
        } catch (e) {
          addToast('error', e instanceof ApiClientError ? e.error.message : '有効化に失敗しました');
        }
        setConfirm(null);
      },
    });
  };

  const handleDelete = (user: AdminUser) => {
    setConfirm({
      title: 'ユーザー削除',
      message: `"${user.userId}" を削除しますか？\n帳簿・明細などすべてのデータが完全に削除されます。この操作は元に戻せません。`,
      onConfirm: async () => {
        try {
          await deleteAdminUser(user.userId);
          addToast('success', 'ユーザーを削除しました');
          fetchUsers();
        } catch (e) {
          addToast('error', e instanceof ApiClientError ? e.error.message : '削除に失敗しました');
        }
        setConfirm(null);
      },
    });
  };

  // ─── フィルタリング ──────────────────────────────────────────
  const filtered = users.filter((u) => {
    if (filterRole !== 'ALL' && u.role !== filterRole) return false;
    if (filterActive === 'ACTIVE' && !u.isActive) return false;
    if (filterActive === 'INACTIVE' && u.isActive) return false;
    return true;
  });

  // ─── ローディング中・未認証は何も表示しない ──────────────────
  if (role !== 'SYSTEM_ADMIN') return null;

  // ─── レンダリング ─────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">管理者画面</h1>
        <button
          onClick={() => { setShowCreateForm((v) => !v); reset(); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? 'キャンセル' : '＋ ユーザー追加'}
        </button>
      </div>

      {/* ユーザー追加フォーム */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">新規ユーザー追加</h2>
          <form onSubmit={handleSubmit(handleCreate)} noValidate className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                ユーザーID
              </label>
              <input
                {...register('userId')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100"
                placeholder="user_id"
              />
              {errors.userId && <p className="mt-1 text-xs text-red-500">{errors.userId.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                パスワード
              </label>
              <input
                type="password"
                {...register('password')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100"
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                ロール
              </label>
              <select
                {...register('role')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="USER">USER</option>
                <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
              </select>
            </div>
            <div className="col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? '作成中...' : '作成'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* フィルター */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">ロール:</span>
          {(['ALL', 'USER', 'SYSTEM_ADMIN'] as FilterRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                filterRole === r
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {r === 'ALL' ? 'すべて' : r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">状態:</span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as FilterActive[]).map((a) => (
            <button
              key={a}
              onClick={() => setFilterActive(a)}
              className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                filterActive === a
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {a === 'ALL' ? 'すべて' : a === 'ACTIVE' ? '有効' : '無効'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-gray-500 dark:text-gray-400">{filtered.length} 件</span>
      </div>

      {/* ユーザー一覧テーブル */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">ユーザーが見つかりません</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">ユーザーID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">ロール</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">状態</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">登録日</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-100">{user.userId}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === 'SYSTEM_ADMIN'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                    }`}>
                      {user.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleChangeRole(user)}
                        className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        ロール変更
                      </button>
                      {user.isActive ? (
                        <button
                          onClick={() => handleDeactivate(user)}
                          className="px-3 py-1 text-xs border border-orange-300 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 transition-colors"
                        >
                          無効化
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(user)}
                          className="px-3 py-1 text-xs border border-green-300 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors"
                        >
                          有効化
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user)}
                        className="px-3 py-1 text-xs border border-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 確認ダイアログ */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{confirm.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line mb-6">
              {confirm.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={confirm.onConfirm}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
              >
                実行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
