type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

const ErrorState = ({
  message = 'データの取得に失敗しました',
  onRetry,
}: ErrorStateProps) => (
  <div className="flex flex-col items-center justify-center gap-3 py-10">
    <svg
      className="w-10 h-10 text-red-400 dark:text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        再試行
      </button>
    )}
  </div>
);

export default ErrorState;
