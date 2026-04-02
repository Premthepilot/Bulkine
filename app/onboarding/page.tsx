'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ProgressBar from '../components/onboarding/ProgressBar';
import SelectableCard from '../components/onboarding/SelectableCard';

// Smooth animated number display component
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring = useSpring(value, { stiffness: 300, damping: 30 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const [displayValue, setDisplayValue] = useState(value.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return <span className="tabular-nums">{displayValue}</span>;
}

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

// Only steps 1-7 for onboarding (basic questions about body and goals)
const STEPS: Step[] = [
  {
    id: 1,
    type: 'options',
    title: "What's your biggest struggle right now?",
    subtitle: '',
    options: [
      { id: 'cant-gain', emoji: '', title: "I can't gain weight" },
      { id: 'no-results', emoji: '', title: "I eat but don't see results" },
      { id: 'low-appetite', emoji: '', title: "I don't feel hungry often" },
      { id: 'beginner', emoji: '', title: "I'm just starting out" },
    ],
  },
  {
    id: 2,
    type: 'options',
    title: "What's your main focus right now?",
    subtitle: '',
    options: [
      { id: 'gain-weight', emoji: '', title: 'Gain weight' },
      { id: 'build-muscle', emoji: '', title: 'Build muscle' },
      { id: 'eat-consistently', emoji: '', title: 'Eat more consistently' },
      { id: 'fix-appetite', emoji: '', title: 'Fix low appetite' },
    ],
  },
  {
    id: 3,
    type: 'options',
    title: 'How often do you work out?',
    subtitle: '',
    options: [
      { id: 'none', emoji: '', title: "I don't work out yet" },
      { id: '1-2', emoji: '', title: '1–2 times per week' },
      { id: '3-5', emoji: '', title: '3–5 times per week' },
      { id: '6+', emoji: '', title: '6+ times per week' },
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
    title: 'How committed are you right now?',
    subtitle: '',
    options: [
      { id: 'very-serious', emoji: '', title: "I'm all in — ready to bulk 💪" },
      { id: 'serious', emoji: '', title: "I'm serious, but need guidance" },
      { id: 'exploring', emoji: '', title: 'Just getting started' },
    ],
  },
];

const TOTAL_STEPS = 7;
const AUTO_ADVANCE_DELAY = 350;

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

// Direction-aware transition settings
const getPageTransition = (direction: number) => ({
  duration: direction > 0 ? 0.32 : 0.38,
});

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [heightValue, setHeightValue] = useState(170);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [currentWeight, setCurrentWeight] = useState(60);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [goalWeight, setGoalWeight] = useState(60);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Height conversion functions
  const cmToFeetInches = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };

  // Weight conversion functions
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
  const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 10) / 10;

  // Sync goal weight when current weight changes (ensure goal >= current)
  // Also set smart default when first entering goal-weight step
  useEffect(() => {
    if (goalWeight < currentWeight) {
      setGoalWeight(currentWeight);
    }
  }, [currentWeight, goalWeight]);

  // Set smart default goal weight when entering goal-weight step
  const hasSetSmartDefault = useRef(false);
  useEffect(() => {
    if (currentStep === 6 && !hasSetSmartDefault.current) {
      hasSetSmartDefault.current = true;
      // Smart default: current weight + 8kg (healthy goal)
      setGoalWeight(Math.min(currentWeight + 8, 120));
    }
  }, [currentStep, currentWeight]);

  // Goal weight category helper - supportive and encouraging
  const getGainCategory = (gain: number) => {
    if (gain === 0) return {
      label: 'Maintain your current weight',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
      arrowColor: ''
    };
    if (gain <= 8) return {
      label: 'Great starting goal',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      arrowColor: 'text-green-500'
    };
    if (gain <= 15) return {
      label: 'Solid progress target',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      arrowColor: 'text-orange-500'
    };
    return {
      label: "Ambitious goal — we'll guide you",
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      arrowColor: 'text-amber-600'
    };
  };

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

  // Save onboarding data to localStorage and navigate to creating-plan
  const completeOnboarding = () => {
    const onboardingData = {
      bodyType: selections[1],
      mainGoal: selections[2],
      workoutFrequency: selections[3],
      height: heightValue,
      weight: currentWeight,
      goalWeight: goalWeight,
      commitment: selections[7],
    };

    console.log('Onboarding completed, saving data:', onboardingData);

    // Save to localStorage for plan result page
    localStorage.setItem('onboardingData', JSON.stringify(onboardingData));

    // Navigate to plan result page to show summary
    router.push('/plan-result');
  };

  // Auto-advance for option screens
  const handleSelect = (id: string) => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }

    setSelections((prev) => ({ ...prev, [currentStep]: id }));
    setIsTransitioning(true);

    // Auto-advance after delay
    autoAdvanceTimer.current = setTimeout(() => {
      // If on the last step, complete onboarding
      if (currentStep === TOTAL_STEPS) {
        completeOnboarding();
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

    // If on the last step, complete onboarding
    if (currentStep === TOTAL_STEPS) {
      completeOnboarding();
      return;
    }

    // Advance to next step (used for slider screens: height, weight, goal-weight)
    if (currentStep < TOTAL_STEPS) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && !isTransitioning) {
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

  // Check if current step needs a Continue button
  const needsContinueButton =
    currentStepData?.type === 'weight' ||
    currentStepData?.type === 'goal-weight' ||
    currentStepData?.type === 'height';

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
      const { feet, inches } = cmToFeetInches(heightValue);
      const minFtIn = cmToFeetInches(currentStepData.min);
      const maxFtIn = cmToFeetInches(currentStepData.max);

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="w-full pt-4"
        >
          {/* Unit Toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              <button
                type="button"
                onClick={() => setHeightUnit('cm')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  heightUnit === 'cm'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                cm
              </button>
              <button
                type="button"
                onClick={() => setHeightUnit('ft')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  heightUnit === 'ft'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ft/in
              </button>
            </div>
          </div>

          {/* Height Display with Smooth Animation */}
          <div className="text-center mb-4">
            <div className="inline-flex items-baseline">
              {heightUnit === 'cm' ? (
                <>
                  <span className="text-6xl font-bold text-gray-900">
                    <AnimatedNumber value={heightValue} />
                  </span>
                  <span className="text-2xl font-medium text-gray-400 ml-2">
                    cm
                  </span>
                </>
              ) : (
                <>
                  <span className="text-6xl font-bold text-gray-900">
                    <AnimatedNumber value={feet} />
                  </span>
                  <span className="text-2xl font-medium text-gray-400 ml-1">
                    ft
                  </span>
                  <span className="text-6xl font-bold text-gray-900 ml-3">
                    <AnimatedNumber value={inches} />
                  </span>
                  <span className="text-2xl font-medium text-gray-400 ml-1">
                    in
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-center text-sm text-gray-400 mb-10">
            This helps us calculate your calorie needs
          </p>

          {/* Smooth Slider */}
          <div className="relative h-12">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-orange-500 rounded-full"
                style={{ width: `${percentage}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>

            <motion.div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${percentage}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="w-7 h-7 -ml-3.5 rounded-full bg-orange-500 shadow-lg flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
            </motion.div>

            <input
              type="range"
              min={currentStepData.min}
              max={currentStepData.max}
              step={1}
              value={heightValue}
              onInput={(e) => setHeightValue(Number((e.target as HTMLInputElement).value))}
              onChange={(e) => setHeightValue(Number(e.target.value))}
              className="slider-input absolute inset-0 w-full h-full cursor-pointer opacity-0"
              aria-label={`Height: ${heightUnit === 'cm' ? `${heightValue} cm` : `${feet} ft ${inches} in`}`}
            />
          </div>

          <div className="flex justify-between mt-4">
            {heightUnit === 'cm' ? (
              <>
                <span className="text-sm text-gray-400">{currentStepData.min} cm</span>
                <span className="text-sm text-gray-400">{currentStepData.max} cm</span>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-400">{minFtIn.feet}'{minFtIn.inches}"</span>
                <span className="text-sm text-gray-400">{maxFtIn.feet}'{maxFtIn.inches}"</span>
              </>
            )}
          </div>
        </motion.div>
      );
    }

    if (currentStepData.type === 'weight') {
      const percentage = ((currentWeight - currentStepData.min) / (currentStepData.max - currentStepData.min)) * 100;
      const displayWeight = weightUnit === 'kg' ? currentWeight : kgToLbs(currentWeight);
      const minDisplay = weightUnit === 'kg' ? currentStepData.min : kgToLbs(currentStepData.min);
      const maxDisplay = weightUnit === 'kg' ? currentStepData.max : kgToLbs(currentStepData.max);

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="w-full pt-4"
        >
          {/* Unit Toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              <button
                type="button"
                onClick={() => setWeightUnit('kg')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  weightUnit === 'kg'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                kg
              </button>
              <button
                type="button"
                onClick={() => setWeightUnit('lbs')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  weightUnit === 'lbs'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                lbs
              </button>
            </div>
          </div>

          {/* Weight Display with Smooth Animation */}
          <div className="text-center mb-4">
            <div className="inline-flex items-baseline">
              <span className="text-6xl font-bold text-gray-900">
                <AnimatedNumber value={displayWeight} decimals={weightUnit === 'lbs' ? 1 : 0} />
              </span>
              <span className="text-2xl font-medium text-gray-400 ml-2">
                {weightUnit}
              </span>
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-center text-sm text-gray-400 mb-10">
            This helps us set your calorie target
          </p>

          {/* Smooth Slider */}
          <div className="relative h-12">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-orange-500 rounded-full"
                style={{ width: `${percentage}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>

            <motion.div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${percentage}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="w-7 h-7 -ml-3.5 rounded-full bg-orange-500 shadow-lg flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
            </motion.div>

            <input
              type="range"
              min={currentStepData.min}
              max={currentStepData.max}
              step={0.5}
              value={currentWeight}
              onInput={(e) => setCurrentWeight(Number((e.target as HTMLInputElement).value))}
              onChange={(e) => setCurrentWeight(Number(e.target.value))}
              className="slider-input absolute inset-0 w-full h-full cursor-pointer opacity-0"
              aria-label={`Weight: ${displayWeight} ${weightUnit}`}
            />
          </div>

          <div className="flex justify-between mt-4">
            <span className="text-sm text-gray-400">{minDisplay} {weightUnit}</span>
            <span className="text-sm text-gray-400">{maxDisplay} {weightUnit}</span>
          </div>
        </motion.div>
      );
    }

    if (currentStepData.type === 'goal-weight') {
      const difference = goalWeight - currentWeight;
      const percentage = ((goalWeight - currentWeight) / (currentStepData.max - currentWeight)) * 100;
      const gainCategory = getGainCategory(difference);

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="w-full pt-4"
        >
          {/* Goal Weight Display with Smooth Animation */}
          <div className="text-center mb-4">
            <div className="inline-flex items-baseline">
              <span className="text-6xl font-bold text-gray-900">
                <AnimatedNumber value={goalWeight} />
              </span>
              <span className="text-2xl font-medium text-gray-400 ml-2">
                {currentStepData.unit}
              </span>
            </div>
          </div>

          {/* Dynamic Gain Indicator with Supportive Feedback */}
          <motion.div
            key={gainCategory.label}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2 mb-6"
          >
            <span className={`
              inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
              ${gainCategory.bgColor} ${gainCategory.textColor}
            `}>
              {difference > 0 && <span className={gainCategory.arrowColor}>↑</span>}
              {difference === 0 ? 'No change' : `+${difference} kg`}
            </span>
            <span className={`text-xs font-medium ${gainCategory.textColor}`}>
              {gainCategory.label}
            </span>
          </motion.div>

          {/* Recommendation Text */}
          <p className="text-center text-sm text-gray-400 mb-8">
            Recommended gain: 0.25–0.5 kg/week
          </p>

          {/* Smooth Slider */}
          <div className="relative h-12">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-orange-500 rounded-full"
                style={{ width: `${percentage}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>

            <motion.div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${percentage}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="w-7 h-7 -ml-3.5 rounded-full bg-orange-500 shadow-lg flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
            </motion.div>

            <input
              type="range"
              min={currentWeight}
              max={currentStepData.max}
              step={1}
              value={goalWeight}
              onInput={(e) => setGoalWeight(Number((e.target as HTMLInputElement).value))}
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
              transition={getPageTransition(direction)}
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
    </div>
  );
}
