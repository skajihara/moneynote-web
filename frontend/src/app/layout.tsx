import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { Toasts } from '@/components/ui/Toast';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MoneyNote Web',
  description: 'Web版家計簿管理アプリ',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja" className={notoSansJP.className}>
      <body>
        {children}
        <Toasts />
      </body>
    </html>
  );
};

export default RootLayout;
