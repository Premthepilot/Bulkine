'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

export default function ProgressBar({
  currentStep,
  totalSteps = 7,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isActive = isCompleted || isCurrent;

          return (
            <motion.div
              key={index}
              className="h-[5px] flex-1 rounded-full bg-gray-200 overflow-hidden"
            >
              <motion.div
                className="h-full bg-orange-500 rounded-full"
                initial={false}
                animate={{
                  width: isActive ? '100%' : '0%',
                }}
                transition={{
                  duration: 0.3,
                  delay: isActive ? index * 0.05 : 0,
                  ease: [0.4, 0, 0.2, 1],
                }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
