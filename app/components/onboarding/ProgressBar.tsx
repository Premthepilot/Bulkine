'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

export default function ProgressBar({
  currentStep,
  totalSteps = 8,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isActive = isCompleted || isCurrent;

          return (
            <motion.div
              key={index}
              className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden"
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
      <div className="flex items-center justify-between mt-2">
        <motion.span
          key={currentStep}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs font-medium text-slate-400"
        >
          Step {currentStep} of {totalSteps}
        </motion.span>
      </div>
    </div>
  );
}
