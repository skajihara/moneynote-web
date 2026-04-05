import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoneyNote Web',
  description: 'Web版家計簿管理アプリ',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
