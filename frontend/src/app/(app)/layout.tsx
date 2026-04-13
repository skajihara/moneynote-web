'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import Header from '@/components/layout/Header';
import SideMenu from '@/components/layout/SideMenu';
import LedgerCreateModal from '@/components/ledger/LedgerCreateModal';

const SubPanel = ({ children }: { children: ReactNode }) => (
  <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
    <div className="p-4">{children}</div>
  </aside>
);

type AppLayoutProps = {
  children: ReactNode;
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const { isOpen, content, contentKey, close } = useSubPanelStore();
  const { ledgers, fetchLedgers } = useLedgerStore();
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    fetchLedgers().finally(() => setLoading(false));
  }, [fetchLedgers]);

  // パス変更時にサブパネルを閉じる
  useEffect(() => {
    close();
  }, [pathname, close]);

  // ローディング中はモーダル判定を保留する
  const showCreateModal = !loading && ledgers.length === 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <SideMenu />
        <main className="flex-1 overflow-auto bg-gray-50 p-4">{children}</main>
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
