type EmptyStateProps = {
  message: string;
  icon?: string;
  action?: { label: string; onClick: () => void };
};

const EmptyState = ({ message, icon, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-400 dark:text-gray-500">
    {icon ? (
      <span className="text-4xl">{icon}</span>
    ) : (
      <svg
        className="w-12 h-12 opacity-30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    )}
    <p className="text-sm text-center">{message}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="mt-1 px-4 py-2 text-sm rounded-md btn-theme"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
