'use client';

import { useRef, useEffect } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface LottieAnimationProps {
  animationData: unknown;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  onComplete?: () => void;
}

/**
 * Optimized Lottie animation component
 * - Uses lottie-react for performance
 * - Supports auto-play and completion callbacks
 * - Lightweight and mobile-friendly
 */
export default function LottieAnimation({
  animationData,
  width = 100,
  height = 100,
  loop = false,
  autoplay = true,
  className = '',
  onComplete,
}: LottieAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (onComplete && lottieRef.current) {
      const checkComplete = () => {
        if (lottieRef.current && !loop) {
          onComplete();
        }
      };

      // Listen for complete event on non-loop animations
      const interval = setInterval(() => {
        if (lottieRef.current?.animationItem?.isPaused) {
          checkComplete();
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [onComplete, loop]);

  return (
    <div
      className={className}
      style={{
        width,
        height,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width, height }}
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid slice',
        }}
      />
    </div>
  );
}
