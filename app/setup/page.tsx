'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ProgressBar from '../components/onboarding/ProgressBar';
import SelectableCard from '../components/onboarding/SelectableCard';
import { generatePlanFromOnboarding } from '@/lib/diet-engine';
import { upsertUserProfile, getCurrentUser } from '@/lib/local-data';

interface OptionStep {
  id: number;
  type: 'options';
  title: string;
  subtitle: string;
  options: { id: string; emoji: string; title: string }[];
}

type Step = OptionStep;

// Steps 8-11 for setup (preferences needed for plan generation)
const STEPS: Step[] = [
  {
    id: 1,
    type: 'options',
    title: 'How would you describe your appetite?',
    subtitle: '',
    options: [
      { id: 'struggle', emoji: '', title: 'I struggle to eat enough' },
      { id: 'normal', emoji: '', title: 'I eat a moderate amount' },
      { id: 'lot', emoji: '', title: 'I can eat large portions easily' },
    ],
  },
  {
    id: 2,
    type: 'options',
    title: 'How often do you eat in a day?',
    subtitle: '',
    options: [
      { id: '1-2', emoji: '', title: '1–2 times' },
      { id: '2-3', emoji: '', title: '2–3 times' },
      { id: '3-4', emoji: '', title: '3–4 times' },
      { id: '4+', emoji: '', title: '4+ times' },
    ],
  },
  {
    id: 3,
    type: 'options',
    title: 'Diet preference?',
    subtitle: '',
    options: [
      { id: 'vegetarian', emoji: '', title: 'Vegetarian' },
      { id: 'non-veg', emoji: '', title: 'Non-vegetarian' },
      { id: 'eggetarian', emoji: '', title: 'Eggetarian' },
    ],
  },
  {
    id: 4,
    type: 'options',
    title: 'How much time can you spend on workouts?',
    subtitle: '',
    options: [
      { id: 'none', emoji: '', title: "I don't work out" },
      { id: '10-20', emoji: '', title: '10–20 minutes' },
      { id: '30-45', emoji: '', title: '30–45 minutes' },
      { id: '60+', emoji: '', title: '60+ minutes' },
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

interface OnboardingData {
  bodyType: string;
  mainGoal: string;
  workoutFrequency: string;
  height: number;
  weight: number;
  goalWeight: number;
  commitment: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load onboarding data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('onboardingData');
    if (savedData) {
      setOnboardingData(JSON.parse(savedData));
    } else {
      // No onboarding data found, redirect back
      console.warn('No onboarding data found, redirecting to onboarding');
      router.replace('/onboarding');
    }
  }, [router]);

  const currentStepData = STEPS.find((s) => s.id === currentStep);
  const selectedOption = selections[currentStep] ?? null;

  // Check if current step has a valid selection
  const hasValidSelection = selectedOption !== null;

  // Complete setup: combine data, generate plan, save to Supabase
  const completeSetup = async () => {
    if (!onboardingData) {
      setSaveError('Missing onboarding data');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      console.log('[SetupPage] Starting completeSetup...');
      console.log('[SetupPage] Onboarding data:', JSON.stringify(onboardingData, null, 2));
      console.log('[SetupPage] Current selections:', JSON.stringify(selections, null, 2));

      const user = await getCurrentUser();
      console.log('[SetupPage] User from getCurrentUser:', user ? { id: user.id, email: user.email } : 'null');

      if (!user) {
        console.error('[SetupPage] User not authenticated');
        setSaveError('User not authenticated. Please log in again.');
        router.push('/login');
        return;
      }

      // Combine all data
      const completeData = {
        bodyType: onboardingData.bodyType,
        mainGoal: onboardingData.mainGoal,
        workoutFrequency: onboardingData.workoutFrequency,
        height: onboardingData.height,
        weight: onboardingData.weight,
        goalWeight: onboardingData.goalWeight,
        commitment: onboardingData.commitment,
        appetite: selections[1],
        mealsPerDay: selections[2],
        dietPreference: selections[3],
        workoutTime: selections[4],
      };

      console.log('[SetupPage] Complete user data:', JSON.stringify(completeData, null, 2));

      // Validate required fields
      const requiredFields = ['bodyType', 'mainGoal', 'height', 'weight', 'goalWeight'];
      const missingFields = requiredFields.filter(field => completeData[field as keyof typeof completeData] === undefined);
      if (missingFields.length > 0) {
        console.error('[SetupPage] Missing required fields:', missingFields);
        setSaveError(`Missing required data: ${missingFields.join(', ')}`);
        setIsSaving(false);
        return;
      }

      // Generate the diet plan
      const plan = generatePlanFromOnboarding(completeData);
      console.log('[SetupPage] Generated plan:', JSON.stringify(plan, null, 2));

      // Prepare profile data for Supabase
      // users_data table only has columns: user_id, weight, calories, streak
      const profileData = {
        weight: completeData.weight,
        calories: plan.targetCalories || null,
        streak: 1
      };

      console.log('[SetupPage] Profile data for Supabase:', JSON.stringify(profileData, null, 2));

      // Save to Supabase
      const result = await upsertUserProfile(profileData);
      console.log('[SetupPage] User profile saved successfully:', result);

      // Save plan to localStorage for dashboard access
      localStorage.setItem('userPlan', JSON.stringify(plan));

      // Clear onboarding data (no longer needed)
      localStorage.removeItem('onboardingData');

      // Navigate to creating-plan screen
      console.log('[SetupPage] Setup complete, navigating to creating-plan');
      router.replace('/creating-plan');
    } catch (error) {
      console.error('[SetupPage] Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setSaveError(errorMessage);
      setIsSaving(false);
    }
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
      // If on the last step, complete setup
      if (currentStep === TOTAL_STEPS) {
        // Need to wait for state update, then complete
        const updatedSelections = { ...selections, [currentStep]: id };
        setSelections(updatedSelections);
        // Call completeSetup after state is set
      } else {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      }
      setIsTransitioning(false);
    }, AUTO_ADVANCE_DELAY);
  };

  // Effect to call completeSetup when final selection is made
  useEffect(() => {
    if (currentStep === TOTAL_STEPS && selections[TOTAL_STEPS] && !isSaving && !saveError) {
      completeSetup();
    }
  }, [selections[TOTAL_STEPS]]);

  const handleBack = () => {
    if (currentStep > 1 && !isTransitioning && !isSaving) {
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

  // Show loading if no onboarding data yet
  if (!onboardingData) {
    return (
      <div className="fixed inset-0 h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  const renderStepContent = () => {
    if (!currentStepData) return null;

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
              disabled={isTransitioning || isSaving}
            />
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 h-screen bg-white flex flex-col overflow-hidden">
      {/* Saving overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-50 bg-white/90 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Saving your preferences...</p>
        </div>
      )}

      {/* Error message */}
      {saveError && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-gray-900 font-bold text-lg mb-2">Something went wrong</p>
          <p className="text-gray-600 text-center mb-6">{saveError}</p>
          <button
            onClick={() => {
              setSaveError(null);
              completeSetup();
            }}
            className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-6 py-5">
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
                    disabled={isTransitioning || isSaving}
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
    </div>
  );
}
