'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  stepKey: string | number;
  direction?: 'forward' | 'backward';
}

const variants = {
  enter: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? -40 : 40,
    opacity: 0,
  }),
};

export default function PageTransition({
  children,
  stepKey,
  direction = 'forward',
}: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          duration: 0.25,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
