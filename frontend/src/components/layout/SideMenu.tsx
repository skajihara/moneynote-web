'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useThemeStore } from '@/stores/themeStore';

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
    label: '予算・レポート',
    href: (id) => `/ledgers/${id}/reports`,
    requiresLedger: true,
  },
  {
    label: 'AI分析',
    href: (id) => `/ledgers/${id}/ai`,
    requiresLedger: true,
  },
  {
    label: '検索',
    href: '/search',
    requiresLedger: true,
  },
  {
    label: '固定費',
    href: '/fixed-transactions',
    requiresLedger: true,
  },
  {
    label: 'CSV',
    href: '/csv',
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
  const { isDark } = useThemeStore();

  return (
    <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
      <nav className="p-2 flex flex-col gap-0.5">
        {menuItems.map((item) => {
          // 帳簿が必要なメニューかつ未選択の場合は無効化する
          if (item.requiresLedger && !selectedLedgerId) {
            return (
              <span
                key={item.label}
                className="px-3 py-2 text-sm text-gray-300 dark:text-gray-600 rounded-md cursor-not-allowed"
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
              className="px-3 py-2 text-sm rounded-md transition-colors"
              style={
                isActive
                  ? {
                      backgroundColor: isDark
                        ? 'color-mix(in srgb, var(--theme-color) 20%, #1F2937)'
                        : 'color-mix(in srgb, var(--theme-color) 12%, white)',
                      color: 'var(--theme-color)',
                      fontWeight: 600,
                    }
                  : { color: isDark ? '#D1D5DB' : '#4B5563' }
              }
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
