'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import { logout as logoutApi } from '@/lib/api/auth';

const Header = () => {
  const router = useRouter();
  const { userName, logout: authLogout } = useAuthStore();
  const addToast = useToastStore((state) => state.add);
  const { ledgers, selectedLedgerId, selectLedger } = useLedgerStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedLedger = ledgers.find((l) => l.ledgerId === selectedLedgerId);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ログアウト API が失敗してもクライアント側はクリアする
    }
    authLogout();
    router.push('/login');
    addToast('success', 'ログアウトしました');
  };

  const handleSelectLedger = (ledgerId: string) => {
    selectLedger(ledgerId);
    setDropdownOpen(false);
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      {/* 左: ロゴ */}
      <span className="font-bold text-gray-800 text-lg">MoneyNote Web</span>

      {/* 中央: 帳簿セレクター */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors min-w-[180px] justify-between"
        >
          <span className="truncate">
            {selectedLedger ? selectedLedger.ledgerName : '帳簿を選択'}
          </span>
          <span className="text-gray-400">▾</span>
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
            {ledgers.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-400">帳簿がありません</div>
            ) : (
              ledgers.map((ledger) => (
                <button
                  key={ledger.ledgerId}
                  onClick={() => handleSelectLedger(ledger.ledgerId)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    ledger.ledgerId === selectedLedgerId
                      ? 'font-semibold text-blue-600'
                      : 'text-gray-700'
                  }`}
                >
                  {ledger.ledgerName}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* 右: ユーザー名・ログアウト */}
      <div className="flex items-center gap-3">
        {userName && (
          <span className="text-sm text-gray-500">{userName}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
};

export default Header;
