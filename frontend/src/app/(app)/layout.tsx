'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { refresh } from '@/lib/api/auth';
import Header from '@/components/layout/Header';
import SideMenu from '@/components/layout/SideMenu';
import SubPanel from '@/components/layout/SubPanel';
import LedgerCreateModal from '@/components/ledger/LedgerCreateModal';

type AppLayoutProps = {
  children: ReactNode;
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const { isOpen, content, contentKey, close } = useSubPanelStore();
  const { ledgers, fetchLedgers } = useLedgerStore();
  const themeColor = useAuthStore((s) => s.themeColor);
  const initTheme = useThemeStore((s) => s.init);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // テーマカラーを CSS 変数に同期する
  useEffect(() => {
    document.documentElement.style.setProperty('--theme-color', themeColor || '#4A90D9');
  }, [themeColor]);

  // ダークモードの初期状態を DOM から Zustand ストアに同期する（アンチフラッシュスクリプトが先に DOM を設定済み）
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    const init = async () => {
      try {
        // リロード時はアクセストークンがメモリから消えているため、
        // HttpOnly Cookie のリフレッシュトークンを使って再取得する
        const res = await refresh();
        useAuthStore.getState().setAccessToken(res.data.accessToken);
        // children のレンダリングをトークン取得後まで遅延させ、
        // 子コンポーネントの API 呼び出しが必ずトークン付きで行われるようにする
        setInitialized(true);
      } catch {
        useAuthStore.getState().logout();
        router.push('/login');
        return;
      }
      await fetchLedgers().catch(() => {});
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // パス変更時にサブパネルを閉じる
  useEffect(() => {
    close();
  }, [pathname, close]);

  // ローディング中はモーダル判定を保留する
  const showCreateModal = !loading && ledgers.length === 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden min-w-[1280px]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <SideMenu />
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4">{initialized && children}</main>
        {isOpen && content && (
          <SubPanel>
            {/* contentKey が変わるたびに div が再マウントされ、内部フォームも初期化される */}
            <div key={contentKey}>{content}</div>
          </SubPanel>
        )}
      </div>

      {showCreateModal && (
        <LedgerCreateModal onCreated={() => {/* fetchLedgers 済のため何もしない */}} />
      )}
    </div>
  );
};

export default AppLayout;
