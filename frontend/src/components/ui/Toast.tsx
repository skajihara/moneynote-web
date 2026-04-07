'use client';

import { useEffect } from 'react';
import { useToastStore, ToastType } from '@/stores/toastStore';

const TOAST_DURATION = 3000;

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
};

type ToastItemProps = {
  id: string;
  type: ToastType;
  message: string;
};

const ToastItem = ({ id, type, message }: ToastItemProps) => {
  const remove = useToastStore((state) => state.remove);

  useEffect(() => {
    const timer = setTimeout(() => remove(id), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [id, remove]);

  return (
    <div
      role="alert"
      className={`${typeStyles[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-64 max-w-sm`}
    >
      <span className="text-sm">{message}</span>
      <button
        onClick={() => remove(id)}
        className="ml-4 text-white hover:text-gray-200 text-lg leading-none"
        aria-label="閉じる"
      >
        &times;
      </button>
    </div>
  );
};

const Toasts = () => {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export { Toasts };
export default Toasts;
