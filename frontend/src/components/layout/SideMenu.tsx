'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLedgerStore } from '@/stores/ledgerStore';

type MenuItem = {
  label: string;
  href: string | ((ledgerId: string) => string);
  requiresLedger: boolean;
};

const menuItems: MenuItem[] = [
  {
    label: 'ダッシュボード',
    href: '/dashboard',
    requiresLedger: false,
  },
  {
    label: '明細・入力',
    href: (id) => `/ledgers/${id}/transactions`,
    requiresLedger: true,
  },
  {
    label: 'レポート',
    href: (id) => `/ledgers/${id}/reports`,
    requiresLedger: true,
  },
  {
    label: '予算',
    href: (id) => `/ledgers/${id}/budget`,
    requiresLedger: true,
  },
  {
    label: 'AI分析',
    href: (id) => `/ledgers/${id}/ai`,
    requiresLedger: true,
  },
  {
    label: '設定',
    href: '/settings',
    requiresLedger: false,
  },
];

const SideMenu = () => {
  const pathname = usePathname();
  const selectedLedgerId = useLedgerStore((state) => state.selectedLedgerId);

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <nav className="p-2 flex flex-col gap-0.5">
        {menuItems.map((item) => {
          // 帳簿が必要なメニューかつ未選択の場合は無効化する
          if (item.requiresLedger && !selectedLedgerId) {
            return (
              <span
                key={item.label}
                className="px-3 py-2 text-sm text-gray-300 rounded-md cursor-not-allowed"
              >
                {item.label}
              </span>
            );
          }

          const href =
            typeof item.href === 'function'
              ? item.href(selectedLedgerId!)
              : item.href;

          const isActive = pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={item.label}
              href={href}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default SideMenu;
