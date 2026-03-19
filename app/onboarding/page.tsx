'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface TimelineStep {
  id: number;
  type: 'timeline';
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

type Step = OptionStep | WeightStep | GoalWeightStep | TimelineStep | HeightStep;

const STEPS: Step[] = [
  {
    id: 1,
    type: 'options',
    title: 'What describes you best?',
    subtitle: "We'll personalize your plan",
    options: [
      { id: 'skinny', emoji: '🦴', title: "Very skinny, can't gain weight" },
      { id: 'no-results', emoji: '😤', title: 'Tried gym but no results' },
      { id: 'low-appetite', emoji: '🍽️', title: 'Low appetite' },
    ],
  },
  {
    id: 2,
    type: 'options',
    title: "What's your main goal?",
    subtitle: 'Choose your primary focus',
    options: [
      { id: 'muscle', emoji: '💪', title: 'Build muscle mass' },
      { id: 'strength', emoji: '🏋️', title: 'Get stronger' },
      { id: 'weight', emoji: '⚖️', title: 'Gain healthy weight' },
    ],
  },
  {
    id: 3,
    type: 'options',
    title: 'How often can you work out?',
    subtitle: "We'll match your schedule",
    options: [
      { id: '2-3', emoji: '📅', title: '2-3 times per week' },
      { id: '4-5', emoji: '🔥', title: '4-5 times per week' },
      { id: '6+', emoji: '⚡', title: '6+ times per week' },
    ],
  },
  {
    id: 4,
    type: 'weight',
    title: "What's your current weight?",
    subtitle: "We'll use this to personalize your plan",
    min: 40,
    max: 120,
    default: 60,
    unit: 'kg',
  },
  {
    id: 5,
    type: 'goal-weight',
    title: "What's your goal weight?",
    subtitle: "Let's set your transformation goal",
    min: 40,
    max: 120,
    default: 70,
    unit: 'kg',
  },
  {
    id: 6,
    type: 'height',
    title: "What's your height?",
    subtitle: 'This helps us personalize your plan',
    min: 140,
    max: 200,
    default: 170,
    unit: 'cm',
  },
  {
    id: 7,
    type: 'timeline',
  },
];

const ENCOURAGEMENTS = [
  "Nice! Let's continue",
  'Great choice!',
  "You're doing great!",
  'Perfect!',
  'Awesome!',
];

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
    opacity: 0,
  }),
};

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [heightValue, setHeightValue] = useState(170);
  const [currentWeight, setCurrentWeight] = useState(60);
  const [goalWeight, setGoalWeight] = useState(60);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [isPlanReady, setIsPlanReady] = useState(false);
  const [animatedWeight, setAnimatedWeight] = useState(currentWeight);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

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
    if (currentStepData.type === 'timeline') return true;
    return false;
  })();

  const handleSelect = (id: string) => {
    setSelections((prev) => ({ ...prev, [currentStep]: id }));
  };

  const handleContinue = () => {
    if (hasValidSelection && currentStep < 7) {
      // Show feedback message
      const randomMessage =
        ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
      setFeedbackMessage(randomMessage);
      setShowFeedback(true);

      // If on height step (6), show loading overlay instead of advancing
      if (currentStep === 6) {
        setTimeout(() => {
          setShowLoadingOverlay(true);
        }, 150);
      } else {
        // Transition to next step after brief delay
        setTimeout(() => {
          setDirection(1);
          setCurrentStep((prev) => prev + 1);
        }, 150);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Auto-hide feedback message
  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => setShowFeedback(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [showFeedback]);

  // Loading overlay animation
  useEffect(() => {
    if (showLoadingOverlay) {
      const messages = [
        'Analyzing your body...',
        'Calculating your calorie needs...',
        'Designing your routine...',
        'Finalizing your plan...',
      ];

      // Reset progress when loading starts
      setLoadingProgress(0);
      setLoadingMessageIndex(0);
      setIsPlanReady(false);

      // Smoothly animate progress bar
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) return 100;
          return prev + 2; // Increment by 2% every 50ms = 2.5 seconds total
        });
      }, 50);

      // Cycle through messages
      const messageTimers = messages.map((_, index) => {
        return setTimeout(() => {
          setLoadingMessageIndex(index);
        }, index * 625); // 625ms per message = 2.5 seconds total for 4 messages
      });

      // Show "Your plan is ready!" after loading completes
      const readyTimer = setTimeout(() => {
        setIsPlanReady(true);
      }, 2500);

      // Auto-advance to step 7 (timeline) after showing ready state
      const advanceTimer = setTimeout(() => {
        setShowLoadingOverlay(false);
        setDirection(1);
        setCurrentStep(7);
      }, 3300); // 2500ms loading + 800ms ready state

      return () => {
        clearInterval(progressInterval);
        messageTimers.forEach(timer => clearTimeout(timer));
        clearTimeout(readyTimer);
        clearTimeout(advanceTimer);
      };
    }
  }, [showLoadingOverlay]);

  // Animate weight count-up on timeline screen
  useEffect(() => {
    if (currentStepData?.type === 'timeline') {
      setAnimatedWeight(currentWeight);

      const weightDiff = goalWeight - currentWeight;
      const duration = 800; // 800ms for snappier animation
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
  }, [currentStepData?.type, currentWeight, goalWeight]);

  const renderStepContent = () => {
    // Show loading overlay if triggered
    if (showLoadingOverlay) {
      const messages = [
        'Analyzing your body...',
        'Calculating your calorie needs...',
        'Designing your routine...',
        'Finalizing your plan...',
      ];

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center min-h-[60vh]"
        >
          <AnimatePresence mode="wait">
            {!isPlanReady ? (
              <motion.div
                key="loading"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                {/* Title */}
                <h1 className="text-2xl font-bold text-slate-900 mb-12">
                  Creating your plan...
                </h1>

                {/* Dynamic Message */}
                <div className="mb-8 h-6">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMessageIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="text-base text-slate-600 font-medium"
                    >
                      {messages[loadingMessageIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${loadingProgress}%` }}
                      transition={{ duration: 0.05, ease: 'linear' }}
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Step Indicator */}
                <div className="flex gap-2 mt-8">
                  {messages.map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0.8, opacity: 0.3 }}
                      animate={{
                        scale: loadingMessageIndex === index ? 1 : 0.8,
                        opacity: loadingMessageIndex >= index ? 1 : 0.3,
                      }}
                      transition={{ duration: 0.3 }}
                      className={`w-2 h-2 rounded-full ${
                        loadingMessageIndex >= index ? 'bg-orange-500' : 'bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center"
              >
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6"
                >
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>

                {/* Ready Message */}
                <h1 className="text-2xl font-bold text-slate-900">
                  Your plan is ready!
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    if (!currentStepData) {
      return (
        <div className="text-center py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-5xl mb-4"
          >
            🎉
          </motion.div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Coming soon!
          </h1>
          <p className="text-sm text-slate-500">
            More steps will be added here.
          </p>
        </div>
      );
    }

    if (currentStepData.type === 'options') {
      return (
        <>
          {/* Options */}
          <div className="flex flex-col gap-3">
            {currentStepData.options.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.08,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <SelectableCard
                  id={option.id}
                  emoji={option.emoji}
                  title={option.title}
                  isSelected={selectedOption === option.id}
                  onSelect={handleSelect}
                />
              </motion.div>
            ))}
          </div>
        </>
      );
    }

    if (currentStepData.type === 'height') {
      const percentage = ((heightValue - currentStepData.min) / (currentStepData.max - currentStepData.min)) * 100;

      return (
        <>
          {/* Height Display & Slider */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full"
          >
            {/* Large Number Display */}
            <div className="text-center mb-12">
              <span className="text-7xl font-bold text-slate-900 tabular-nums">
                {heightValue}
              </span>
              <span className="text-2xl font-medium text-slate-400 ml-2">
                {currentStepData.unit}
              </span>
            </div>

            {/* Slider */}
            <div className="relative h-12">
              {/* Visual Track */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-slate-200 rounded-full">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Visual Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${percentage}%` }}
              >
                <div className="w-6 h-6 -ml-3 rounded-full bg-orange-500 shadow-lg shadow-orange-300/50 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>

              {/* Invisible Native Input */}
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

            {/* Min/Max Labels */}
            <div className="flex justify-between mt-3">
              <span className="text-sm text-slate-400">{currentStepData.min} cm</span>
              <span className="text-sm text-slate-400">{currentStepData.max} cm</span>
            </div>
          </motion.div>
        </>
      );
    }

    if (currentStepData.type === 'weight') {
      return (
        <>
          {/* Weight Slider */}
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
        </>
      );
    }

    if (currentStepData.type === 'goal-weight') {
      const difference = goalWeight - currentWeight;
      const differenceText = difference === 0
        ? 'Maintain current weight'
        : `+${difference} kg gain`;
      const percentage = ((goalWeight - currentWeight) / (currentStepData.max - currentWeight)) * 100;

      return (
        <>
          {/* Goal Weight Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full"
          >
            {/* Large Number Display */}
            <div className="text-center mb-4">
              <span className="text-7xl font-bold text-slate-900 tabular-nums">
                {goalWeight}
              </span>
              <span className="text-2xl font-medium text-slate-400 ml-2">
                {currentStepData.unit}
              </span>
            </div>

            {/* Difference Badge */}
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
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-green-50 text-green-600'
                }
              `}>
                {difference > 0 && <span className="text-green-500">↑</span>}
                {differenceText}
              </span>
            </motion.div>

            {/* Slider */}
            <div className="relative h-12">
              {/* Visual Track */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-slate-200 rounded-full">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Visual Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${percentage}%` }}
              >
                <div className="w-6 h-6 -ml-3 rounded-full bg-orange-500 shadow-lg shadow-orange-300/50 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>

              {/* Invisible Native Input - min is current weight */}
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

            {/* Labels Row */}
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-slate-400">{currentWeight} kg</span>
              <span className="text-sm text-slate-400">{currentStepData.max} kg</span>
            </div>
          </motion.div>
        </>
      );
    }

    if (currentStepData.type === 'timeline') {
      const weightToGain = goalWeight - currentWeight;
      // Healthy weight gain: ~3 kg per month
      const months = Math.max(1, Math.ceil(weightToGain / 3));

      return (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative text-center flex flex-col items-center justify-center min-h-[65vh]"
          >
            {/* Header */}
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-xl font-semibold text-slate-900 mb-12"
            >
              Your plan is ready
            </motion.h1>

            {/* Central Glass Circle Container */}
            <div className="relative flex items-center justify-center mb-10">
              {/* Glow Layer - Very large blurred circle, no shadows */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-orange-500/15 blur-[120px] pointer-events-none"
                aria-hidden="true"
              />

              {/* Glass Circle */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="relative z-10 w-56 h-56 rounded-full backdrop-blur-sm bg-white/60 border border-white/80 flex flex-col items-center justify-center"
              >
                {/* Goal Weight Number - Hero Element */}
                <div className="text-[5rem] font-bold bg-gradient-to-br from-orange-500 to-orange-600 bg-clip-text text-transparent tabular-nums leading-none tracking-tight">
                  {animatedWeight}
                </div>

                {/* Unit */}
                <div className="text-lg font-normal text-slate-400 mt-1">kg</div>

                {/* From Text */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                  className="text-xs text-slate-400 mt-1"
                >
                  From {currentWeight} kg
                </motion.div>
              </motion.div>
            </div>

            {/* Gain Info Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-50 border border-orange-100"
            >
              <span className="text-orange-500 text-sm">↑</span>
              <span className="text-sm font-semibold text-orange-600">
                +{weightToGain} kg gain
              </span>
              <span className="text-xs text-slate-500">
                in ~{months} {months === 1 ? 'month' : 'months'}
              </span>
            </motion.div>
          </motion.div>
        </>
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

      {/* Feedback Toast */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
              <span className="text-orange-400">✓</span>
              {feedbackMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#F8FAFC]/70 backdrop-blur-sm border-b border-slate-100/80 px-5 py-4">
        <div className="max-w-sm mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={7} />
        </div>
      </header>

      {/* Main Content with Transitions */}
      <main className="relative flex-1 px-5 py-8">
        <div className="max-w-sm mx-auto">
          {/* Header Row with Back Button and Title */}
          {!showLoadingOverlay && currentStepData && currentStepData.type !== 'timeline' && (
            <div className="flex items-center gap-3 mb-6">
              {/* Back Button */}
              <AnimatePresence mode="wait">
                {currentStep > 1 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    type="button"
                    onClick={handleBack}
                    className="flex-shrink-0 w-9 h-9 rounded-full border border-gray-200 bg-transparent flex items-center justify-center transition-all duration-150 active:scale-90 hover:border-gray-300"
                    aria-label="Go back"
                  >
                    <svg
                      className="w-5 h-5 text-slate-600"
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
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Title Section */}
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {currentStepData.title}
                </h1>
                {'subtitle' in currentStepData && (
                  <p className="text-sm text-slate-500">{currentStepData.subtitle}</p>
                )}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={showLoadingOverlay ? 'loading' : currentStep}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.25,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer - Hidden during loading overlay */}
      {!showLoadingOverlay && (
        <footer className="sticky bottom-0 bg-[#F8FAFC] border-t border-slate-100 px-5 py-4 pb-6">
          <div className="max-w-sm mx-auto">
            {/* Continue Button - Primary Action */}
            <motion.button
              type="button"
              onClick={handleContinue}
              disabled={!hasValidSelection}
              whileTap={hasValidSelection ? { scale: 0.97 } : {}}
              className={
                hasValidSelection
                  ? 'w-full py-3.5 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ease-out bg-orange-500 text-white shadow-lg shadow-orange-200 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-200'
                  : 'w-full py-3.5 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ease-out bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            >
              {currentStepData?.type === 'timeline' ? 'Start my journey' : currentStepData?.type === 'height' ? 'Create my plan' : 'Continue'}
            </motion.button>
          </div>
        </footer>
      )}
    </div>
  );
}
