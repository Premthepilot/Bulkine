import { motion } from 'framer-motion';

interface SmallLoadingStateProps {
  message?: string;
}

export function SmallLoadingState({ message = 'Loading...' }: SmallLoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50"
    >
      <motion.div
        className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <span className="text-xs text-gray-600">{message}</span>
    </motion.div>
  );
}
