import type { Metadata } from 'next';
import './globals.css';
import { Toasts } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'MoneyNote Web',
  description: 'Web版家計簿管理アプリ',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* ダークモードのフラッシュを防ぐためにハイドレーション前にクラスを設定する */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('darkMode');var d=v==='dark'||(v===null&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Toasts />
      </body>
    </html>
  );
};

export default RootLayout;
