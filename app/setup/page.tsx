'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ProgressBar from '../components/onboarding/ProgressBar';
import SelectableCard from '../components/onboarding/SelectableCard';
import LottieAnimation from '../components/animations/LottieAnimation';
import { successCheckmark } from '../components/animations/lottieData';

interface OptionStep {
  id: number;
  type: 'options';
  title: string;
  options: { id: string; title: string }[];
}

type Step = OptionStep;

const STEPS: Step[] = [
  {
    id: 1,
    type: 'options',
    title: 'How is your appetite?',
    options: [
      { id: 'struggle', title: 'I struggle to eat' },
      { id: 'normal', title: 'I eat normally' },
      { id: 'lot', title: 'I can eat a lot' },
    ],
  },
  {
    id: 2,
    type: 'options',
    title: 'How many meals per day?',
    options: [
      { id: '2', title: '2 meals' },
      { id: '3', title: '3 meals' },
      { id: '4+', title: '4+ meals' },
    ],
  },
  {
    id: 3,
    type: 'options',
    title: 'Diet preference?',
    options: [
      { id: 'vegetarian', title: 'Vegetarian' },
      { id: 'non-veg', title: 'Non-vegetarian' },
      { id: 'eggetarian', title: 'Eggetarian' },
    ],
  },
  {
    id: 4,
    type: 'options',
    title: 'Time for workouts?',
    options: [
      { id: '10-20', title: '10–20 minutes' },
      { id: '30-45', title: '30–45 minutes' },
      { id: '60', title: '1 hour' },
    ],
  },
];

const TOTAL_STEPS = 4;
const AUTO_ADVANCE_DELAY = 350;

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

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'normal' | 'creating' | 'final'>('normal');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  const currentStepData = STEPS.find((s) => s.id === currentStep);
  const selectedOption = selections[currentStep] ?? null;

  const handleSelect = (id: string) => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }

    setSelections((prev) => ({ ...prev, [currentStep]: id }));
    setIsTransitioning(true);

    autoAdvanceTimer.current = setTimeout(() => {
      if (currentStep === TOTAL_STEPS) {
        setTransitionPhase('creating');
      } else {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      }
      setIsTransitioning(false);
    }, AUTO_ADVANCE_DELAY);
  };

  const handleBack = () => {
    if (currentStep > 1 && !isTransitioning && transitionPhase === 'normal') {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsTransitioning(false);
  }, [currentStep]);

  useEffect(() => {
    if (transitionPhase === 'creating') {
      setLoadingProgress(0);

      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) return 100;
          return prev + 3.33;
        });
      }, 50);

      const finalTimer = setTimeout(() => {
        setTransitionPhase('final');
      }, 1500);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(finalTimer);
      };
    }
  }, [transitionPhase]);

  useEffect(() => {
    if (transitionPhase === 'final') {
      const redirectTimer = setTimeout(() => {
        router.push('/dashboard');
      }, 800);

      return () => clearTimeout(redirectTimer);
    }
  }, [transitionPhase, router]);

  const renderStepContent = () => {
    if (!currentStepData) return null;

    if (currentStepData.type === 'options') {
      return (
        <div className="flex flex-col gap-4">
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
              <SelectableCard
                id={option.id}
                title={option.title}
                isSelected={selectedOption === option.id}
                onSelect={handleSelect}
                disabled={isTransitioning}
              />
            </motion.div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 h-screen bg-white flex flex-col overflow-hidden">
      {/* Creating Phase */}
      {transitionPhase === 'creating' && (
        <div className="h-screen flex flex-col items-center justify-center bg-white px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center w-full max-w-sm"
          >
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-3xl font-bold text-gray-900 mb-3"
            >
              Personalizing your plan
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-gray-500 mb-12"
            >
              This will only take a moment
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="w-full max-w-[280px] mb-8"
            >
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${Math.min(loadingProgress, 100)}%` }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
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
                    ease: "easeInOut",
                  }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Final Phase - Success */}
      {transitionPhase === 'final' && (
        <div className="h-screen flex flex-col items-center justify-center bg-white px-6">
          <motion.div
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

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-2xl font-bold text-gray-900"
            >
              All set!
            </motion.h1>
          </motion.div>
        </div>
      )}

      {/* Normal Phase - Question Steps */}
      {transitionPhase === 'normal' && (
        <>
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-5">
            <div className="max-w-sm mx-auto">
              <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
            </div>
          </header>

          {/* Main Content */}
          <main className="relative flex-1 px-6 pt-6">
            <div className="max-w-sm mx-auto">
              {/* Header Row with Back Button and Title */}
              {currentStepData && (
                <motion.div
                  key={`header-${currentStep}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mb-10"
                >
                  <div className="flex items-center gap-3">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        disabled={isTransitioning}
                        className="flex-shrink-0 w-10 h-10 -ml-2 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50 rounded-full hover:bg-gray-100 active:bg-gray-200"
                      >
                        <svg
                          className="w-6 h-6"
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
                      </button>
                    )}

                    <h1 className="text-[26px] font-bold text-gray-900 leading-tight">
                      {currentStepData.title}
                    </h1>
                  </div>
                </motion.div>
              )}

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
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
        </>
      )}
    </div>
  );
}
