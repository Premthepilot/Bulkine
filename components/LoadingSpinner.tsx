import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message = 'Loading...', fullScreen = false }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {message && <p className="text-sm text-gray-600 text-center">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">{content}</div>;
  }

  return <div className="flex items-center justify-center py-12">{content}</div>;
}
