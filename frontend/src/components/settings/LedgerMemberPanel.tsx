'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLedgerStore } from '@/stores/ledgerStore';
import {
  getMembers,
  addMember,
  updateMember,
  removeMember,
} from '@/lib/api/ledger';
import type { LedgerMember, PermissionType } from '@/lib/api/ledger';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';

const PERMISSION_LABELS: Record<PermissionType, string> = {
  OWNER:  'オーナー',
  ADMIN:  '管理者',
  EDITOR: '編集者',
  VIEWER: '閲覧者',
};

const ASSIGNABLE: Exclude<PermissionType, 'OWNER'>[] = ['VIEWER', 'EDITOR', 'ADMIN'];

const inviteSchema = z.object({
  userId:         z.string().min(1, 'ユーザーIDを入力してください'),
  permissionType: z.enum(['VIEWER', 'EDITOR', 'ADMIN']),
});
type InviteForm = z.infer<typeof inviteSchema>;

type LedgerMemberPanelProps = {
  ledgerId: string;
};

const LedgerMemberPanel = ({ ledgerId }: LedgerMemberPanelProps) => {
  const addToast = useToastStore((s) => s.add);
  const canAdmin = useLedgerStore((s) => {
    const ledger = s.ledgers.find((l) => l.ledgerId === ledgerId);
    if (!ledger) return false;
    return ledger.myPermissionType === 'ADMIN' || ledger.myPermissionType === 'OWNER';
  });

  const [members,   setMembers]   = useState<LedgerMember[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerm,  setEditPerm]  = useState<Exclude<PermissionType, 'OWNER'>>('VIEWER');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<InviteForm>({
      resolver: zodResolver(inviteSchema),
      defaultValues: { permissionType: 'VIEWER' },
    });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMembers(ledgerId);
      setMembers(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [ledgerId]);

  useEffect(() => { load(); }, [load]);

  const onInvite = async (values: InviteForm) => {
    try {
      await addMember(ledgerId, {
        userId: values.userId,
        permissionType: values.permissionType,
      });
      addToast('success', 'メンバーを招待しました');
      reset();
      load();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '招待に失敗しました';
      addToast('error', msg);
    }
  };

  const onUpdatePerm = async (userId: string) => {
    try {
      await updateMember(ledgerId, userId, { permissionType: editPerm });
      addToast('success', '権限を変更しました');
      setEditingId(null);
      load();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '権限変更に失敗しました';
      addToast('error', msg);
    }
  };

  const onRemove = async (userId: string) => {
    if (!confirm(`${userId} をメンバーから削除しますか？`)) return;
    try {
      await removeMember(ledgerId, userId);
      addToast('success', 'メンバーを削除しました');
      load();
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.error.message : '削除に失敗しました';
      addToast('error', msg);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* メンバー一覧 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">メンバー一覧</h2>
        {loading ? (
          <LoadingSpinner />
        ) : members.length === 0 ? (
          <EmptyState message="メンバーがいません" icon="👥" />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{m.userName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{m.userId}</p>
                </div>

                {/* 権限表示 or 編集 */}
                {canAdmin && editingId === m.userId && m.permissionType !== 'OWNER' ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editPerm}
                      onChange={(e) => setEditPerm(e.target.value as Exclude<PermissionType, 'OWNER'>)}
                      className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 dark:text-gray-100"
                    >
                      {ASSIGNABLE.map((p) => (
                        <option key={p} value={p}>{PERMISSION_LABELS[p]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => onUpdatePerm(m.userId)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.permissionType === 'OWNER'  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                    m.permissionType === 'ADMIN'  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'   :
                    m.permissionType === 'EDITOR' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {PERMISSION_LABELS[m.permissionType]}
                  </span>
                )}

                {/* ADMIN のみ操作ボタン表示 */}
                {canAdmin && m.permissionType !== 'OWNER' && editingId !== m.userId && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingId(m.userId); setEditPerm(m.permissionType as Exclude<PermissionType, 'OWNER'>); }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      変更
                    </button>
                    <button
                      onClick={() => onRemove(m.userId)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 招待フォーム（ADMIN以上のみ） */}
      {canAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">メンバーを招待</h2>
          <form onSubmit={handleSubmit(onInvite)} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ユーザーID</label>
              <input
                {...register('userId')}
                type="text"
                placeholder="招待するユーザーのIDを入力"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              {errors.userId && (
                <p className="text-red-500 text-xs mt-1">{errors.userId.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">権限</label>
              <select
                {...register('permissionType')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                {ASSIGNABLE.map((p) => (
                  <option key={p} value={p}>{PERMISSION_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '招待中...' : '招待する'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default LedgerMemberPanel;
