'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmEmailChange } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';
import { Suspense } from 'react';

type Status = 'loading' | 'success' | 'error';

const EmailChangeConfirmContent = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('確認リンクが無効または期限切れです。');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    confirmEmailChange(token)
      .then(() => setStatus('success'))
      .catch((e) => {
        const msg =
          e instanceof ApiClientError
            ? e.error.message
            : '確認リンクが無効または期限切れです。';
        setErrorMessage(msg);
        setStatus('error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') {
    return <p className="text-sm text-gray-500">処理中...</p>;
  }

  if (status === 'success') {
    return (
      <>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
          メールアドレスを変更しました。新しいメールアドレスでご利用ください。
        </p>
        <Link
          href="/login"
          className="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
        >
          ログイン画面へ
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-red-500 mb-6">{errorMessage}</p>
      <Link href="/login" className="text-sm text-gray-500 hover:underline">
        ログイン画面へ
      </Link>
    </>
  );
};

const EmailChangeConfirmPage = () => {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-6">
        メールアドレス変更の確認
      </h2>
      <Suspense fallback={<p className="text-sm text-gray-500">読み込み中...</p>}>
        <EmailChangeConfirmContent />
      </Suspense>
    </>
  );
};

export default EmailChangeConfirmPage;
