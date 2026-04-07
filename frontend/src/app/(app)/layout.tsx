'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { logout as logoutApi } from '@/lib/api/auth';

// -------------------------
// Header（ログアウトボタン付き）
// -------------------------

const Header = () => {
  const router = useRouter();
  const { userName, logout: authLogout } = useAuthStore();
  const addToast = useToastStore((state) => state.add);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ログアウトAPIが失敗してもクライアント側はクリアする
    }
    authLogout();
    router.push('/login');
    addToast('success', 'ログアウトしました');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <span className="font-semibold text-gray-700">MoneyNote Web</span>
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

// -------------------------
// SideMenu プレースホルダー
// 後続 Step で実装予定
// -------------------------

const SideMenu = () => (
  <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
    <nav className="p-4">
      <p className="text-xs text-gray-400">メニュー（後続 Step で実装）</p>
    </nav>
  </aside>
);

const SubPanel = ({ children }: { children: ReactNode }) => (
  <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
    <div className="p-4">{children}</div>
  </aside>
);

// -------------------------
// アプリ共通レイアウト（3ペイン構造）
// -------------------------

type AppLayoutProps = {
  children: ReactNode;
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const { isOpen, content } = useSubPanelStore();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <SideMenu />
        <main className="flex-1 overflow-auto bg-gray-50 p-4">{children}</main>
        {isOpen && content && <SubPanel>{content}</SubPanel>}
      </div>
    </div>
  );
};

export default AppLayout;
