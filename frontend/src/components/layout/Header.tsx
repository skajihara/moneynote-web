'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { logout as logoutApi } from '@/lib/api/auth';
import LedgerMemberPanel from '@/components/settings/LedgerMemberPanel';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { userName, logout: authLogout } = useAuthStore();
  const addToast = useToastStore((state) => state.add);
  const { ledgers, selectedLedgerId, selectLedger } = useLedgerStore();
  const canAdmin = useLedgerStore((s) => s.canAdmin)();
  const { close: closePanel, open: openPanel } = useSubPanelStore();
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

  const handleSelectLedger = (newLedgerId: string) => {
    selectLedger(newLedgerId);
    closePanel();
    setDropdownOpen(false);

    // /ledgers/{ledgerId}/* にいる場合は新しい帳簿のパスへ遷移する
    const ledgerPathMatch = pathname.match(/^(\/ledgers\/)([^/]+)(\/.*)?$/);
    if (ledgerPathMatch) {
      const prefix = ledgerPathMatch[1]; // '/ledgers/'
      const suffix = ledgerPathMatch[3] ?? ''; // '/transactions' 等
      router.push(`${prefix}${newLedgerId}${suffix}`);
    }
  };

  const handleOpenMembers = () => {
    if (!selectedLedgerId) return;
    openPanel(<LedgerMemberPanel ledgerId={selectedLedgerId} />);
  };

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-4 shrink-0"
      style={{ backgroundColor: 'var(--theme-color)', borderBottomColor: 'transparent' }}
    >
      {/* 左: ロゴ */}
      <span className="font-bold text-white text-lg">MoneyNote Web</span>

      {/* 中央: 帳簿セレクター + メンバー管理ボタン */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/20 border border-white/40 rounded-md text-sm text-white hover:bg-white/30 transition-colors min-w-[180px] justify-between"
          >
            <span className="truncate">
              {selectedLedger ? selectedLedger.ledgerName : '帳簿を選択'}
            </span>
            <span className="text-white/70">▾</span>
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
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                    style={
                      ledger.ledgerId === selectedLedgerId
                        ? { fontWeight: 600, color: 'var(--theme-color)' }
                        : { color: '#374151' }
                    }
                  >
                    {ledger.ledgerName}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* メンバー管理ボタン（ADMIN 以上・帳簿選択時のみ表示） */}
        {selectedLedger && canAdmin && (
          <button
            onClick={handleOpenMembers}
            title="メンバー管理"
            aria-label="メンバー管理"
            className="text-sm text-white border border-white/40 rounded-md px-3 py-1 hover:bg-white/20 transition-colors"
          >
            メンバー管理
          </button>
        )}
      </div>

      {/* 右: ユーザー名・ログアウト */}
      <div className="flex items-center gap-3">
        {userName && (
          <span className="text-sm text-white/80">{userName}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-white border border-white/40 rounded-md px-3 py-1 hover:bg-white/20 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
};

export default Header;
