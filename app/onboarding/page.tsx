'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ProgressBar from '../components/onboarding/ProgressBar';
import SelectableCard from '../components/onboarding/SelectableCard';
import WeightSlider from '../components/onboarding/WeightSlider';

interface OptionStep {
  id: number;
  type: 'options';
  title: string;
  subtitle: string;
  options: { id: string; emoji: string; title: string }[];
}

interface WeightStep {
  id: number;
  type: 'weight';
  title: string;
  subtitle: string;
  min: number;
  max: number;
  default: number;
  unit: string;
}

interface GoalWeightStep {
  id: number;
  type: 'goal-weight';
  title: string;
  subtitle: string;
  min: number;
  max: number;
  default: number;
  unit: string;
}

interface HeightStep {
  id: number;
  type: 'height';
  title: string;
  subtitle: string;
  min: number;
  max: number;
  default: number;
  unit: string;
}

type Step = OptionStep | WeightStep | GoalWeightStep | HeightStep;

const STEPS: Step[] = [
  {
    id: 1,
    type: 'options',
    title: 'What describes you best?',
    subtitle: '',
    options: [
      { id: 'skinny', emoji: '', title: 'Very skinny' },
      { id: 'no-results', emoji: '', title: 'Tried gym but no results' },
      { id: 'low-appetite', emoji: '', title: 'Low appetite' },
    ],
  },
  {
    id: 2,
    type: 'options',
    title: "What's your main goal?",
    subtitle: '',
    options: [
      { id: 'gain-weight', emoji: '', title: 'Gain weight' },
      { id: 'build-muscle', emoji: '', title: 'Build muscle' },
      { id: 'improve-appetite', emoji: '', title: 'Improve appetite' },
      { id: 'stay-consistent', emoji: '', title: 'Stay consistent' },
    ],
  },
  {
    id: 3,
    type: 'options',
    title: 'How many meals do you eat daily?',
    subtitle: '',
    options: [
      { id: '1-2', emoji: '', title: '1-2 meals' },
      { id: '3', emoji: '', title: '3 meals' },
      { id: '4-5', emoji: '', title: '4-5 meals' },
      { id: '5+', emoji: '', title: '5+ meals' },
    ],
  },
  {
    id: 4,
    type: 'height',
    title: "What's your height?",
    subtitle: '',
    min: 140,
    max: 200,
    default: 170,
    unit: 'cm',
  },
  {
    id: 5,
    type: 'weight',
    title: "What's your current weight?",
    subtitle: '',
    min: 40,
    max: 120,
    default: 60,
    unit: 'kg',
  },
  {
    id: 6,
    type: 'goal-weight',
    title: "What's your goal weight?",
    subtitle: '',
    min: 40,
    max: 120,
    default: 70,
    unit: 'kg',
  },
  {
    id: 7,
    type: 'options',
    title: 'How serious are you about gaining weight?',
    subtitle: '',
    options: [
      { id: 'very-serious', emoji: '', title: "Very serious - I'm all in" },
      { id: 'serious', emoji: '', title: 'Serious - but need guidance' },
      { id: 'exploring', emoji: '', title: 'Just exploring options' },
    ],
  },
];

const TOTAL_STEPS = 7;
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

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [heightValue, setHeightValue] = useState(170);
  const [currentWeight, setCurrentWeight] = useState(60);
  const [goalWeight, setGoalWeight] = useState(60);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [animatedWeight, setAnimatedWeight] = useState(currentWeight);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Transition phase: controls screen rendering to prevent flicker
  // "normal" → regular step flow
  // "creating" → creating plan screen (no going back)
  // "final" → timeline screen (no going back)
  const [transitionPhase, setTransitionPhase] = useState<'normal' | 'creating' | 'final'>('normal');

  // Sync goal weight when current weight changes (ensure goal >= current)
  useEffect(() => {
    if (goalWeight < currentWeight) {
      setGoalWeight(currentWeight);
    }
  }, [currentWeight, goalWeight]);

  const currentStepData = STEPS.find((s) => s.id === currentStep);
  const selectedOption = selections[currentStep] ?? null;

  // Check if current step has a valid selection
  const hasValidSelection = (() => {
    if (!currentStepData) return false;
    if (currentStepData.type === 'options') return selectedOption !== null;
    if (currentStepData.type === 'height') return true;
    if (currentStepData.type === 'weight') return true;
    if (currentStepData.type === 'goal-weight') return true;
    return false;
  })();

  // Auto-advance for option screens
  const handleSelect = (id: string) => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }

    setSelections((prev) => ({ ...prev, [currentStep]: id }));
    setIsTransitioning(true);

    // Auto-advance after delay
    autoAdvanceTimer.current = setTimeout(() => {
      // If on the last question (step 7), trigger creating phase
      if (currentStep === TOTAL_STEPS) {
        setTransitionPhase('creating');
      } else {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      }
      setIsTransitioning(false);
    }, AUTO_ADVANCE_DELAY);
  };

  // Manual continue for slider screens
  const handleContinue = () => {
    if (!hasValidSelection) return;

    // Handle timeline step - navigate to setup
    if (transitionPhase === 'final') {
      router.push('/setup');
      return;
    }

    // Advance to next step (used for slider screens: height, weight, goal-weight)
    if (currentStep < TOTAL_STEPS) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
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

  // Handle creating phase animation
  useEffect(() => {
    if (transitionPhase === 'creating') {
      setLoadingProgress(0);
      setLoadingMessageIndex(0);

      // Progress bar: fill over 3 seconds
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) return 100;
          return prev + 1.67;
        });
      }, 50);

      // Change message every 1 second
      const messageTimers = [0, 1, 2].map((index) => {
        return setTimeout(() => {
          setLoadingMessageIndex(index);
        }, index * 1000);
      });

      // Transition directly to final phase after loading completes
      const finalTimer = setTimeout(() => {
        setTransitionPhase('final');
      }, 3000);

      return () => {
        clearInterval(progressInterval);
        messageTimers.forEach(timer => clearTimeout(timer));
        clearTimeout(finalTimer);
      };
    }
  }, [transitionPhase]);

  // Animate weight count-up on final (timeline) screen
  useEffect(() => {
    if (transitionPhase === 'final') {
      setAnimatedWeight(currentWeight);

      const weightDiff = goalWeight - currentWeight;
      const duration = 800;
      const steps = 30;
      const increment = weightDiff / steps;
      const intervalTime = duration / steps;

      let currentValue = currentWeight;
      let stepCount = 0;

      const interval = setInterval(() => {
        stepCount++;
        currentValue += increment;

        if (stepCount >= steps) {
          setAnimatedWeight(goalWeight);
          clearInterval(interval);
        } else {
          setAnimatedWeight(Math.round(currentValue));
        }
      }, intervalTime);

      return () => clearInterval(interval);
    }
  }, [transitionPhase, currentWeight, goalWeight]);

  // Check if current step needs a Continue button
  const needsContinueButton =
    transitionPhase === 'normal' && (
      currentStepData?.type === 'weight' ||
      currentStepData?.type === 'goal-weight' ||
      currentStepData?.type === 'height'
    ) || transitionPhase === 'final';

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
                emoji={option.emoji}
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

    if (currentStepData.type === 'height') {
      const percentage = ((heightValue - currentStepData.min) / (currentStepData.max - currentStepData.min)) * 100;

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="w-full pt-4"
        >
          <div className="text-center mb-12">
            <span className="text-6xl font-bold text-gray-900 tabular-nums">
              {heightValue}
            </span>
            <span className="text-2xl font-medium text-gray-400 ml-2">
              {currentStepData.unit}
            </span>
          </div>

          <div className="relative h-12">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-100"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100"
              style={{ left: `${percentage}%` }}
            >
              <div className="w-6 h-6 -ml-3 rounded-full bg-orange-500 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>

            <input
              type="range"
              min={currentStepData.min}
              max={currentStepData.max}
              value={heightValue}
              onChange={(e) => setHeightValue(Number(e.target.value))}
              className="slider-input absolute inset-0 w-full h-full cursor-pointer opacity-0"
              aria-label={`Height: ${heightValue} ${currentStepData.unit}`}
            />
          </div>

          <div className="flex justify-between mt-4">
            <span className="text-sm text-gray-400">{currentStepData.min} cm</span>
            <span className="text-sm text-gray-400">{currentStepData.max} cm</span>
          </div>
        </motion.div>
      );
    }

    if (currentStepData.type === 'weight') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <WeightSlider
            value={currentWeight}
            onChange={setCurrentWeight}
            min={currentStepData.min}
            max={currentStepData.max}
            unit={currentStepData.unit}
          />
        </motion.div>
      );
    }

    if (currentStepData.type === 'goal-weight') {
      const difference = goalWeight - currentWeight;
      const differenceText = difference === 0
        ? 'Maintain current weight'
        : `+${difference} kg gain`;
      const percentage = ((goalWeight - currentWeight) / (currentStepData.max - currentWeight)) * 100;

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="w-full pt-4"
        >
          <div className="text-center mb-4">
            <span className="text-6xl font-bold text-gray-900 tabular-nums">
              {goalWeight}
            </span>
            <span className="text-2xl font-medium text-gray-400 ml-2">
              {currentStepData.unit}
            </span>
          </div>

          <motion.div
            key={difference}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center mb-10"
          >
            <span className={`
              inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
              ${difference === 0
                ? 'bg-gray-100 text-gray-600'
                : 'bg-green-50 text-green-600'
              }
            `}>
              {difference > 0 && <span className="text-green-500">↑</span>}
              {differenceText}
            </span>
          </motion.div>

          <div className="relative h-12">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-100"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100"
              style={{ left: `${percentage}%` }}
            >
              <div className="w-6 h-6 -ml-3 rounded-full bg-orange-500 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>

            <input
              type="range"
              min={currentWeight}
              max={currentStepData.max}
              value={goalWeight}
              onChange={(e) => setGoalWeight(Number(e.target.value))}
              className="slider-input absolute inset-0 w-full h-full cursor-pointer opacity-0"
              aria-label={`Goal weight: ${goalWeight} ${currentStepData.unit}`}
            />
          </div>

          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-gray-400">{currentWeight} kg</span>
            <span className="text-sm text-gray-400">{currentStepData.max} kg</span>
          </div>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 h-screen bg-white flex flex-col overflow-hidden">
      {/* ========== CREATING PHASE ========== */}
      {transitionPhase === 'creating' && (
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
                  key={loadingMessageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-orange-500 font-semibold text-sm uppercase tracking-wide"
                >
                  {['CALCULATING YOUR CALORIE NEEDS...', 'DESIGNING YOUR DAILY PLAN...', 'OPTIMIZING FOR YOUR BODY...'][loadingMessageIndex]}
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
                    ease: "easeInOut",
                  }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* ========== FINAL PHASE (Timeline) ========== */}
      {transitionPhase === 'final' && (
        <>
          <main className="relative flex-1 overflow-y-auto flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center text-center w-full h-full"
            >
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="text-2xl font-bold text-gray-900 mb-12"
              >
                Your plan is ready
              </motion.h1>

              <div className="relative flex items-center justify-center mb-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  className="relative z-10 w-56 h-56 rounded-full bg-gray-50 border-2 border-gray-200 flex flex-col items-center justify-center"
                >
                  <div className="text-[5rem] font-bold text-orange-500 tabular-nums leading-none tracking-tight">
                    {animatedWeight}
                  </div>
                  <div className="text-lg font-normal text-gray-400 mt-1">kg</div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                    className="text-xs text-gray-400 mt-1"
                  >
                    From {currentWeight} kg
                  </motion.div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-100 border border-orange-200"
              >
                <span className="text-orange-500 text-sm">↑</span>
                <span className="text-sm font-semibold text-orange-600">
                  +{goalWeight - currentWeight} kg gain
                </span>
                <span className="text-xs text-gray-500">
                  in ~{Math.max(1, Math.ceil((goalWeight - currentWeight) / 3))} {Math.max(1, Math.ceil((goalWeight - currentWeight) / 3)) === 1 ? 'month' : 'months'}
                </span>
              </motion.div>
            </motion.div>
          </main>

          <footer className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 py-6 pb-8">
            <div className="max-w-sm mx-auto">
              <motion.button
                type="button"
                onClick={handleContinue}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 px-6 rounded-2xl text-[17px] font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200"
              >
                Start my journey
              </motion.button>
            </div>
          </footer>
        </>
      )}

      {/* ========== NORMAL PHASE (Steps 1-7) ========== */}
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
                  {/* Back button + Title in flex row */}
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

                    {/* Title */}
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

          {/* Footer - Only show for slider screens */}
          {needsContinueButton && (
            <footer className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 py-6 pb-8">
              <div className="max-w-sm mx-auto">
                <motion.button
                  type="button"
                  onClick={handleContinue}
                  disabled={!hasValidSelection}
                  whileTap={hasValidSelection ? { scale: 0.98 } : {}}
                  className={`
                    w-full py-4 px-6 rounded-2xl text-[17px] font-semibold
                    transition-all duration-200
                    ${
                      hasValidSelection
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  Continue
                </motion.button>
              </div>
            </footer>
          )}
        </>
      )}
    </div>
  );
}
