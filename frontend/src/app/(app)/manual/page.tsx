'use client';

import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const BASE_URL = 'https://skajihara.github.io/moneynote-web';

type ManualSection = {
  label: string;
  description: string;
  manualPath: string;
  adminOnly?: boolean;
};

const manualSections: ManualSection[] = [
  {
    label: 'ダッシュボード',
    description: '今月の収支サマリー・カテゴリグラフ・予算達成状況・最近の明細を一覧で確認する',
    manualPath: 'dashboard',
  },
  {
    label: '明細・入力',
    description: '収支明細の入力・編集・カレンダー表示で日次の収支を管理する',
    manualPath: 'transactions',
  },
  {
    label: '予算・レポート',
    description: '予算設定と月別・年別・全期間の収支レポートを確認する',
    manualPath: 'reports',
  },
  {
    label: 'AI分析',
    description: 'Claude AI による節約スコア・支出診断・アドバイス・翌月予測',
    manualPath: 'ai',
  },
  {
    label: '検索',
    description: 'キーワード・カテゴリ・期間で複数月にまたがる明細を横断検索する',
    manualPath: 'search',
  },
  {
    label: '固定費',
    description: '家賃・サブスクなど定期的な支出を登録して明細を自動生成する',
    manualPath: 'fixed-transactions',
  },
  {
    label: 'CSV',
    description: '明細データを CSV でエクスポートしたり、CSV から一括インポートする',
    manualPath: 'csv',
  },
  {
    label: '設定',
    description: 'アカウント・帳簿・カテゴリ・メンバーの管理',
    manualPath: 'settings',
  },
  {
    label: '管理者画面',
    description: 'ユーザーの作成・ロール変更・有効化・無効化・削除（システム管理者のみ）',
    manualPath: 'admin',
    adminOnly: true,
  },
];

const ManualPage = () => {
  const role = useAuthStore((s) => s.role);
  const { isDark } = useThemeStore();
  const isAdmin = role === 'SYSTEM_ADMIN';

  const visibleSections = manualSections.filter(
    (s) => !s.adminOnly || isAdmin
  );

  const handleOpen = (manualPath: string) => {
    window.open(
      `${BASE_URL}/${manualPath}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme-color)' }}>
        マニュアル
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        各ページの操作手順・機能説明は以下のリンクから確認できます。
      </p>

      <div className="flex flex-col gap-3">
        {visibleSections.map((section) => (
          <div
            key={section.manualPath}
            className="flex items-center justify-between p-4 rounded-lg border transition-colors"
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: isDark ? '#374151' : '#E5E7EB',
            }}
          >
            <div>
              <p
                className="font-semibold text-sm mb-0.5"
                style={{ color: isDark ? '#F9FAFB' : '#111827' }}
              >
                {section.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {section.description}
              </p>
            </div>
            <button
              onClick={() => handleOpen(section.manualPath)}
              className="ml-4 shrink-0 text-sm px-4 py-1.5 rounded-md border transition-colors hover:opacity-80"
              style={{ color: 'var(--theme-color)', borderColor: 'var(--theme-color)' }}
            >
              開く
            </button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">
        マニュアルは GitHub Pages で公開されています:
        <a
          href={BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 underline"
          style={{ color: 'var(--theme-color)' }}
        >
          {BASE_URL}
        </a>
      </p>
    </div>
  );
};

export default ManualPage;
