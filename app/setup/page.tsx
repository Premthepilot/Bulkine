'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LottieAnimation from '../components/animations/LottieAnimation';
import { successCheckmark } from '../components/animations/lottieData';

interface IntroStep {
  id: number;
  type: 'intro';
}

interface OptionStep {
  id: number;
  type: 'options';
  title: string;
  subtitle: string;
  options: { id: string; title: string }[];
}

type Step = IntroStep | OptionStep;

const STEPS: Step[] = [
  {
    id: 1,
    type: 'intro',
  },
  {
    id: 2,
    type: 'options',
    title: 'How is your appetite?',
    subtitle: 'This helps us plan your meals',
    options: [
      { id: 'struggle', title: 'I struggle to eat' },
      { id: 'normal', title: 'I eat normally' },
      { id: 'lot', title: 'I can eat a lot' },
    ],
  },
  {
    id: 3,
    type: 'options',
    title: 'How many meals per day?',
    subtitle: "We'll spread your calories accordingly",
    options: [
      { id: '2', title: '2 meals' },
      { id: '3', title: '3 meals' },
      { id: '4+', title: '4+ meals' },
    ],
  },
  {
    id: 4,
    type: 'options',
    title: 'Diet preference?',
    subtitle: "We'll customize your meal plans",
    options: [
      { id: 'vegetarian', title: 'Vegetarian' },
      { id: 'non-veg', title: 'Non-vegetarian' },
      { id: 'eggetarian', title: 'Eggetarian' },
    ],
  },
  {
    id: 5,
    type: 'options',
    title: 'Time for workouts?',
    subtitle: "We'll match your schedule",
    options: [
      { id: '10-20', title: '10–20 minutes' },
      { id: '30-45', title: '30–45 minutes' },
      { id: '60', title: '1 hour' },
    ],
  },
];

const TOTAL_STEPS = 5;
const AUTO_ADVANCE_DELAY = 350; // ms - matches fill animation duration + buffer

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

function OptionCard({
  title,
  isSelected,
  onSelect,
  disabled,
}: {
  title: string;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const handleClick = () => {
    if (disabled || isSelected) return;
    onSelect();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      animate={{
        scale: isSelected ? 1.02 : 1,
      }}
      transition={{
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={`
        relative w-full px-5 py-4 rounded-2xl text-left border-2 overflow-hidden
        bg-white
        ${disabled ? 'pointer-events-none' : ''}
        ${isSelected
          ? 'border-orange-500'
          : 'border-slate-200 hover:border-slate-300'
        }
      `}
    >
      {/* Left-to-right fill layer */}
      <motion.div
        initial={false}
        animate={{
          width: isSelected ? '100%' : '0%',
        }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="absolute inset-y-0 left-0 bg-orange-500 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <motion.span
        animate={{
          color: isSelected ? '#ffffff' : '#475569',
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 text-[15px] font-medium block"
      >
        {title}
      </motion.span>
    </motion.button>
  );
}

function SegmentedProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum <= current;
          return (
            <motion.div
              key={i}
              className="h-1 flex-1 rounded-full overflow-hidden bg-slate-200"
            >
              <motion.div
                initial={false}
                animate={{ width: isActive ? '100%' : '0%' }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="h-full bg-orange-500 rounded-full"
              />
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-slate-400">
          Step {current} of {total}
        </span>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  const currentStepData = STEPS.find((s) => s.id === currentStep);
  const selectedOption = selections[currentStep] ?? null;

  // Auto-advance after selection
  const handleSelect = (id: string) => {
    // Clear any existing timer
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }

    // Set selection
    setSelections((prev) => ({ ...prev, [currentStep]: id }));
    setIsTransitioning(true);

    // Auto-advance after delay
    autoAdvanceTimer.current = setTimeout(() => {
      if (currentStep < TOTAL_STEPS) {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      } else {
        setShowCompletionOverlay(true);
      }
      setIsTransitioning(false);
    }, AUTO_ADVANCE_DELAY);
  };

  const handleBack = () => {
    if (currentStep > 1 && !isTransitioning) {
      // Clear any pending auto-advance
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleIntroStart = () => {
    setDirection(1);
    setCurrentStep(2);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, []);

  // Reset transitioning state when step changes
  useEffect(() => {
    setIsTransitioning(false);
  }, [currentStep]);

  // Completion overlay animation
  useEffect(() => {
    if (showCompletionOverlay) {
      setLoadingProgress(0);
      setIsReady(false);

      // Progress over 1.5 seconds
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) return 100;
          return prev + 3.33;
        });
      }, 50);

      const readyTimer = setTimeout(() => {
        setIsReady(true);
      }, 1500);

      const redirectTimer = setTimeout(() => {
        router.push('/dashboard');
      }, 2300);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(readyTimer);
        clearTimeout(redirectTimer);
      };
    }
  }, [showCompletionOverlay, router]);

  const renderStepContent = () => {
    if (showCompletionOverlay) {
      return (
        <div className="fixed inset-0 z-50 bg-[#FAFBFC] min-h-screen flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!isReady ? (
              <div
                key="loading"
                className="flex flex-col items-center px-5 w-full max-w-sm"
              >
                <h1 className="text-xl font-semibold text-slate-900 mb-2">
                  Personalizing your plan
                </h1>
                <p className="text-sm text-slate-500 mb-10">
                  This will only take a moment
                </p>

                <div className="w-full max-w-[220px]">
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${Math.min(loadingProgress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <LottieAnimation
                  animationData={successCheckmark}
                  width={120}
                  height={120}
                  loop={false}
                  autoplay
                  className="mb-2"
                />

                <h1 className="text-xl font-semibold text-slate-900">
                  All set!
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (!currentStepData) return null;

    if (currentStepData.type === 'intro') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4"
        >
          <h1 className="text-[26px] font-semibold text-slate-900 mb-3 leading-tight">
            Let&apos;s personalize<br />your plan
          </h1>

          <p className="text-slate-500 text-[15px] max-w-[260px] leading-relaxed mb-10">
            Answer a few quick questions so we can create the perfect plan for you
          </p>

          <motion.button
            type="button"
            onClick={handleIntroStart}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-3.5 rounded-2xl text-[15px] font-semibold bg-orange-500 text-white shadow-lg shadow-orange-200/50 hover:bg-orange-600 transition-colors"
          >
            Let&apos;s go
          </motion.button>
        </motion.div>
      );
    }

    if (currentStepData.type === 'options') {
      return (
        <div className="flex flex-col gap-3">
          {currentStepData.options.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: index * 0.06,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <OptionCard
                title={option.title}
                isSelected={selectedOption === option.id}
                onSelect={() => handleSelect(option.id)}
                disabled={isTransitioning}
              />
            </motion.div>
          ))}

          {/* Helper text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center text-xs text-slate-400 mt-4"
          >
            Tap an option to continue
          </motion.p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] flex flex-col overflow-x-hidden">
      {/* Subtle top gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-orange-100/40 via-orange-50/20 to-transparent"
      />

      {/* Header - hide on intro */}
      {currentStepData?.type !== 'intro' && !showCompletionOverlay && (
        <header className="sticky top-0 z-10 bg-[#F8FAFC]/80 backdrop-blur-md border-b border-slate-100/80 px-5 py-4">
          <div className="max-w-sm mx-auto">
            <SegmentedProgress current={currentStep} total={TOTAL_STEPS} />
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="relative flex-1 px-5 py-6">
        <div className="max-w-sm mx-auto">
          {/* Question Header */}
          {!showCompletionOverlay && currentStepData && currentStepData.type === 'options' && (
            <motion.div
              key={`header-${currentStep}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-6"
            >
              {/* Back button */}
              <button
                type="button"
                onClick={handleBack}
                disabled={isTransitioning}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors mb-4 -ml-1 disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </button>

              {/* Question */}
              <h1 className="text-[22px] font-semibold text-slate-900 mb-1">
                {currentStepData.title}
              </h1>
              <p className="text-sm text-slate-500">{currentStepData.subtitle}</p>
            </motion.div>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={showCompletionOverlay ? 'completion' : currentStep}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
