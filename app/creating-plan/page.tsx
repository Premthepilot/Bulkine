'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

const LOADING_MESSAGES = [
  'CALCULATING YOUR CALORIE NEEDS...',
  'DESIGNING YOUR DAILY PLAN...',
  'OPTIMIZING FOR YOUR BODY...',
];

export default function CreatingPlanPage() {
  const router = useRouter();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  // Progress bar animation - fills over 3 seconds
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 1.67; // ~3 seconds to reach 100%
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, []);

  // Cycle through messages every second
  useEffect(() => {
    const messageTimers = LOADING_MESSAGES.map((_, index) => {
      return setTimeout(() => {
        setMessageIndex(index);
      }, index * 1000);
    });

    return () => {
      messageTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Navigate to plan-result after loading completes
  useEffect(() => {
    if (loadingProgress >= 100) {
      // Small delay after progress completes before navigation
      const timer = setTimeout(() => {
        console.log('Creating plan complete, navigating to plan-result');
        router.replace('/plan-result');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [loadingProgress, router]);

  return (
    <div className="fixed inset-0 h-screen bg-white flex flex-col overflow-hidden">
      <div className="h-screen flex flex-col items-center justify-center bg-white px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center w-full max-w-sm"
        >
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-3xl font-bold text-gray-900 mb-3"
          >
            Creating your plan
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-gray-500 mb-12"
          >
            This will only take a moment
          </motion.p>

          {/* Status text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mb-8"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-orange-500 font-semibold text-sm uppercase tracking-wide"
              >
                {LOADING_MESSAGES[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="w-full max-w-[280px] mb-8"
          >
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${Math.min(loadingProgress, 100)}%` }}
              />
            </div>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex gap-2"
          >
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: 'easeInOut',
                }}
                className="w-2 h-2 bg-gray-400 rounded-full"
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
