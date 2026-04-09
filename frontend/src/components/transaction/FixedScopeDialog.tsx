'use client';

import type { DeleteScope } from '@/types/transaction';

type Props = {
  onSelect: (scope: DeleteScope) => void;
  onCancel: () => void;
};

const FixedScopeDialog = ({ onSelect, onCancel }: Props) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-gray-800 mb-2">固定費明細の変更対象</h3>
        <p className="text-sm text-gray-500 mb-5">
          この明細は固定費から生成されています。変更の対象範囲を選択してください。
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onSelect('SINGLE')}
            className="w-full text-left px-4 py-3 rounded-md border border-gray-300 text-sm hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-800">この1件のみ対象にする</span>
            <p className="text-xs text-gray-500 mt-0.5">この明細だけを変更します</p>
          </button>
          <button
            onClick={() => onSelect('ALL')}
            className="w-full text-left px-4 py-3 rounded-md border border-red-200 text-sm hover:bg-red-50 transition-colors"
          >
            <span className="font-medium text-red-700">全件を対象にする（過去も含む）</span>
            <p className="text-xs text-red-400 mt-0.5">同じ固定費から生成された全明細が対象になります</p>
          </button>
          <button
            onClick={onCancel}
            className="w-full text-center px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default FixedScopeDialog;
