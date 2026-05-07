type LoadingSpinnerProps = {
  compact?: boolean;
};

const LoadingSpinner = ({ compact = false }: LoadingSpinnerProps) => (
  <div className={`flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 ${compact ? 'py-3' : 'py-8'}`}>
    <svg
      className={`animate-spin ${compact ? 'w-4 h-4' : 'w-6 h-6'}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <span className={compact ? 'text-xs' : 'text-sm'}>読み込み中...</span>
  </div>
);

export default LoadingSpinner;
