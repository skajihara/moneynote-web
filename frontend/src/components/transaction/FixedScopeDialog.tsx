'use client';

import { useRouter } from 'next/navigation';

type Props = {
  mode: 'edit' | 'delete';
  onConfirm: () => void;
  onCancel: () => void;
};

const FixedScopeDialog = ({ mode, onConfirm, onCancel }: Props) => {
  const router = useRouter();

  const isEdit = mode === 'edit';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {isEdit ? '固定費明細の編集' : '固定費明細の削除'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          この明細は固定費から自動生成されています。
          {isEdit
            ? 'この1件だけを編集しますか？'
            : 'どのように削除しますか？'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors ${
              isEdit
                ? 'border-blue-300 hover:bg-blue-50'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className={`font-medium ${isEdit ? 'text-blue-700' : 'text-gray-800'}`}>
              {isEdit ? 'この1件のみ編集する' : 'この1件のみ削除する'}
            </span>
            <p className={`text-xs mt-0.5 ${isEdit ? 'text-blue-400' : 'text-gray-500'}`}>
              {isEdit
                ? '他の月の明細には影響しません'
                : 'この明細だけを削除します'}
            </p>
          </button>
          <button
            onClick={() => {
              onCancel();
              router.push('/settings?tab=fixed');
            }}
            className="w-full text-left px-4 py-3 rounded-md border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">固定費設定を変更する</span>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              設定ページで固定費の変更・削除ができます
            </p>
          </button>
          <button
            onClick={onCancel}
            className="w-full text-center px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default FixedScopeDialog;
