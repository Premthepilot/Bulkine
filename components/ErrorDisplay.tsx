import { motion } from 'framer-motion';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  fullScreen?: boolean;
  icon?: string;
}

export function ErrorDisplay({
  title = 'Something went wrong',
  message,
  onRetry,
  isRetrying = false,
  fullScreen = false,
  icon = '⚠️',
}: ErrorDisplayProps) {
  const content = (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="text-center max-w-sm"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
        >
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">{content}</div>;
  }

  return <div className="flex items-center justify-center py-12 px-6">{content}</div>;
}
