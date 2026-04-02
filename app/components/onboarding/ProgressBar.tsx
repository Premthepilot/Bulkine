'use client';

import { useRef, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

// Constants - defined outside component to prevent re-creation
const dotSize = 12; // w-3
const barWidth = 32; // w-8
const gap = 16; // gap-4 (increased to prevent overlap)
const stepWidth = dotSize + gap; // 28px per step

export default function ProgressBar({
  currentStep,
  totalSteps = 7,
}: ProgressBarProps) {
  const prevStepRef = useRef(currentStep);

  // Calculate position: center the bar over the dot
  // Dot center is at: (currentStep - 1) * stepWidth + dotSize/2
  // Bar left edge should be at: dot_center - barWidth/2
  const calculatePosition = (step: number) => {
    const dotCenter = (step - 1) * stepWidth + dotSize / 2;
    return dotCenter - barWidth / 2;
  };

  // Spring configs based on direction
  const forwardSpring = { stiffness: 280, damping: 24 };
  const backwardSpring = { stiffness: 200, damping: 22 };

  // Spring for smooth position animation
  const position = useSpring(calculatePosition(currentStep), forwardSpring);

  // Spring for width animation (creates the stretch effect)
  const width = useSpring(barWidth, forwardSpring);

  // Update animation when step changes
  useEffect(() => {
    const prevStep = prevStepRef.current;
    const newStep = currentStep;

    if (prevStep !== newStep) {
      const isForward = newStep > prevStep;
      const config = isForward ? forwardSpring : backwardSpring;
      const distance = Math.abs(newStep - prevStep) * stepWidth;

      // Update spring configs based on direction
      position.set(calculatePosition(prevStep));
      width.set(barWidth);

      // Phase 1: Stretch to cover both positions
      width.set(barWidth + distance);

      // Phase 2: Move and contract
      setTimeout(() => {
        position.set(calculatePosition(newStep));
        width.set(barWidth);
      }, isForward ? 120 : 150);

      prevStepRef.current = newStep;
    }
  }, [currentStep, position, width]);

  // Transform spring values for use in style
  const x = useTransform(position, (v) => v);
  const w = useTransform(width, (v) => v);

  return (
    <div className="w-full flex justify-center">
      <div className="relative flex items-center gap-4">
        {/* Static dots */}
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className="w-3 h-3 rounded-full bg-gray-300 z-10"
          />
        ))}

        {/* Animated active indicator */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-3 rounded-full bg-orange-500 z-20"
          style={{
            x,
            width: w,
          }}
        />
      </div>
    </div>
  );
}
