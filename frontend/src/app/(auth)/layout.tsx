import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">MoneyNote Web</h1>
        <p className="mt-1 text-sm text-gray-500">Web版家計簿管理アプリ</p>
      </div>
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
