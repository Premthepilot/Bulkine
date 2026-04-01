'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface OnboardingData {
  bodyType: string;
  mainGoal: string;
  workoutFrequency: string;
  height: number;
  weight: number;
  goalWeight: number;
  commitment: string;
}

export default function PlanResultPage() {
  const router = useRouter();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [animatedWeight, setAnimatedWeight] = useState(0);

  // Load onboarding data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('onboardingData');
    if (savedData) {
      const data = JSON.parse(savedData) as OnboardingData;
      setOnboardingData(data);
      setAnimatedWeight(data.weight);
    } else {
      // No data found, redirect back to onboarding
      console.warn('No onboarding data found, redirecting to onboarding');
      router.replace('/onboarding');
    }
  }, [router]);

  // Animate weight count-up when data is loaded
  useEffect(() => {
    if (!onboardingData) return;

    const currentWeight = onboardingData.weight;
    const goalWeight = onboardingData.goalWeight;
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
  }, [onboardingData]);

  // Navigate to setup on button click
  const handleContinue = () => {
    console.log('Plan result complete, navigating to setup');
    router.push('/setup');
  };

  if (!onboardingData) {
    return (
      <div className="fixed inset-0 h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  const weightGain = onboardingData.goalWeight - onboardingData.weight;
  const estimatedMonths = Math.max(1, Math.ceil(weightGain / 3));

  return (
    <div className="fixed inset-0 min-h-screen bg-white flex flex-col overflow-hidden">
      <main className="relative flex-1 overflow-y-auto flex items-start justify-center px-6 py-8 pt-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center w-full max-w-lg pb-8"
        >
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-2xl font-bold text-gray-900 mb-12"
          >
            Your personalized plan is ready
          </motion.h1>

          <div className="relative flex items-center justify-center mb-6">
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
                From {onboardingData.weight} kg
              </motion.div>
            </motion.div>
          </div>

          {/* Plan Explanation */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="text-sm text-gray-400 mb-5 max-w-md"
          >
            You'll gain weight through a structured calorie surplus, smart meal timing, and consistent tracking.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="inline-flex flex-col items-center gap-1 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 mb-6"
          >
            <div className="inline-flex items-center gap-1.5">
              <span className="text-orange-500 text-sm">↑</span>
              <span className="text-sm font-semibold text-orange-600">
                +{weightGain} kg gain
              </span>
              <span className="text-xs text-gray-500">
                in ~{estimatedMonths} {estimatedMonths === 1 ? 'month' : 'months'}
              </span>
            </div>
            <span className="text-xs text-gray-500">Safe and sustainable progress</span>
          </motion.div>

          {/* Summary cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8"
          >
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Current</p>
              <p className="text-xl font-bold text-gray-900">{onboardingData.weight} kg</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Goal</p>
              <p className="text-xl font-bold text-orange-500">{onboardingData.goalWeight} kg</p>
            </div>
          </motion.div>

          {/* How it works section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            className="w-full max-w-sm bg-gray-50 rounded-2xl p-6 text-left"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">How it works</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-0.5">•</span>
                <span className="text-sm text-gray-700">Eat in a calorie surplus daily</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-0.5">•</span>
                <span className="text-sm text-gray-700">Track meals and progress</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-0.5">•</span>
                <span className="text-sm text-gray-700">Stay consistent to hit your goal</span>
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </main>

      <footer className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 py-6 pb-8">
        <div className="max-w-sm mx-auto">
          {/* Motivation text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            className="text-center text-sm text-gray-500 mb-4"
          >
            Stay consistent — results will follow
          </motion.p>

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
    </div>
  );
}
