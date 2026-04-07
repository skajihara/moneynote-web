import type { Metadata } from 'next';
import './globals.css';
import { Toasts } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'MoneyNote Web',
  description: 'Web版家計簿管理アプリ',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja">
      <body>
        {children}
        <Toasts />
      </body>
    </html>
  );
};

export default RootLayout;
