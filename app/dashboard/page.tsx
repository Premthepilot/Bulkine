'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { WeeklyPlanOutput } from '@/lib/diet-engine';
import { searchFoods, type FoodItem, type Ingredient } from '@/lib/food-database';

interface FoodLogEntry {
  id: string;
  name: string;
  kcal: number;
  emoji: string;
  timestamp: number;
  ingredients?: Ingredient[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<WeeklyPlanOutput | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Food logging state
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCalories, setManualCalories] = useState('');
  const [manualName, setManualName] = useState('');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [prevStreak, setPrevStreak] = useState(0);
  const [viewMode, setViewMode] = useState<'daily' | 'overall'>('daily');
  const [tempMessage, setTempMessage] = useState<{ text: string; emoji: string } | null>(null);

  // Weight tracking state
  const [weightHistory, setWeightHistory] = useState<{ weight: number; date: string }[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [startingWeight, setStartingWeight] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mascotControls = useAnimation();
  const prevCaloriesRef = useRef<number>(0);
  const prevProgressRef = useRef<number>(0);

  // Preload all mascot images to prevent flickering
  useEffect(() => {
    const imagesToPreload = [
      '/mascot/capy-workout.png',
      '/mascot/capy-improving.png',
      '/mascot/capy-strong.png',
    ];

    imagesToPreload.forEach((src) => {
      if (typeof window !== 'undefined') {
        const img = document.createElement('img');
        img.src = src;
      }
    });
  }, []);

  // Load plan and food log from localStorage on mount
  useEffect(() => {
    const storedPlan = localStorage.getItem('userPlan');
    if (storedPlan) {
      try {
        const parsedPlan = JSON.parse(storedPlan) as WeeklyPlanOutput;
        setPlan(parsedPlan);
      } catch (error) {
        console.error('Error loading plan:', error);
        router.push('/onboarding');
      }
    } else {
      router.push('/onboarding');
    }

    // Load today's food log
    const today = new Date().toDateString();
    const storedLog = localStorage.getItem(`foodLog_${today}`);
    if (storedLog) {
      setFoodLog(JSON.parse(storedLog));
    }

    // Load and calculate streak
    const storedStreak = localStorage.getItem('dailyStreak');
    const lastLogDate = localStorage.getItem('lastLogDate');
    const today_date = new Date();
    const yesterday = new Date(today_date);
    yesterday.setDate(yesterday.getDate() - 1);

    if (storedStreak && lastLogDate) {
      const lastDate = new Date(lastLogDate);
      const dayDiff = Math.floor((today_date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 0) {
        // Same day - keep streak
        setStreak(parseInt(storedStreak));
      } else if (dayDiff === 1) {
        // Logged yesterday - keep streak (will update when logging today)
        setStreak(parseInt(storedStreak));
      } else {
        // Streak broken - reset to 0
        setStreak(0);
        localStorage.setItem('dailyStreak', '0');
      }
    } else {
      setStreak(0);
    }

    // Load weight tracking data
    const storedWeightHistory = localStorage.getItem('weightHistory');
    if (storedWeightHistory) {
      setWeightHistory(JSON.parse(storedWeightHistory));
    }

    // Load starting weight from onboarding data
    const onboardingData = localStorage.getItem('onboardingData');
    if (onboardingData) {
      const data = JSON.parse(onboardingData);
      setStartingWeight(data.weight || 0);
    }
  }, [router]);

  // Save food log to localStorage whenever it changes
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem(`foodLog_${today}`, JSON.stringify(foodLog));

    // Update streak when first food is logged today
    if (foodLog.length > 0) {
      const lastLogDate = localStorage.getItem('lastLogDate');
      const today_date = new Date();

      if (!lastLogDate || lastLogDate !== today) {
        // First log today
        const yesterday = new Date(today_date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastLogDate === yesterdayStr) {
          // Logged yesterday, increment streak
          const newStreak = streak + 1;
          setPrevStreak(streak);
          setStreak(newStreak);
          localStorage.setItem('dailyStreak', newStreak.toString());
        } else if (!lastLogDate) {
          // First time logging
          setPrevStreak(0);
          setStreak(1);
          localStorage.setItem('dailyStreak', '1');
        } else {
          // Streak broken, start new
          setPrevStreak(0);
          setStreak(1);
          localStorage.setItem('dailyStreak', '1');
        }

        localStorage.setItem('lastLogDate', today);
      }
    }
  }, [foodLog, streak]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(searchFoods(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Calculate values
  const totalTarget = plan?.targetCalories || 0;
  const surplus = plan?.surplus || 0;

  const caloriesConsumed = foodLog.reduce((sum, entry) => sum + entry.kcal, 0);
  const progress = totalTarget > 0 ? Math.min((caloriesConsumed / totalTarget) * 100, 100) : 0;

  // Get mascot state based on progress
  const getMascotState = () => {
    if (viewMode === 'overall') {
      // Overall view: based on streak (long-term progress)
      if (streak >= 21) {
        return {
          level: 'strong' as const,
          image: '/mascot/capy-strong.png',
          size: 'w-56 h-56',
          glow: 'drop-shadow(0 0 24px rgba(249, 115, 22, 0.35))',
          statusText: "Elite bulker",
          statusEmoji: '👑',
          statusColor: 'text-orange-500',
          bgGlow: 'bg-orange-500/10',
        };
      }
      if (streak >= 8) {
        return {
          level: 'improving' as const,
          image: '/mascot/capy-improving.png',
          size: 'w-52 h-52',
          glow: 'drop-shadow(0 0 16px rgba(249, 115, 22, 0.2))',
          statusText: "Making gains",
          statusEmoji: '💪',
          statusColor: 'text-gray-600',
          bgGlow: 'bg-orange-500/5',
        };
      }
      return {
        level: 'weak' as const,
        image: '/mascot/capy-workout.png',
        size: 'w-48 h-48',
        glow: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
        statusText: "Starting journey",
        statusEmoji: '🌱',
        statusColor: 'text-gray-400',
        bgGlow: 'bg-transparent',
      };
    }

    // Daily view: based on today's progress
    if (progress >= 70) {
      return {
        level: 'strong' as const,
        image: '/mascot/capy-strong.png',
        size: 'w-56 h-56',
        glow: 'drop-shadow(0 0 24px rgba(249, 115, 22, 0.35))',
        statusText: "You're on fire",
        statusEmoji: '🔥',
        statusColor: 'text-orange-500',
        bgGlow: 'bg-orange-500/10',
      };
    }
    if (progress >= 30) {
      return {
        level: 'improving' as const,
        image: '/mascot/capy-improving.png',
        size: 'w-52 h-52',
        glow: 'drop-shadow(0 0 16px rgba(249, 115, 22, 0.2))',
        statusText: "Getting stronger",
        statusEmoji: '💪',
        statusColor: 'text-gray-600',
        bgGlow: 'bg-orange-500/5',
      };
    }
    return {
      level: 'weak' as const,
      image: '/mascot/capy-workout.png',
      size: 'w-48 h-48',
      glow: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
      statusText: "Let's get started",
      statusEmoji: '🌱',
      statusColor: 'text-gray-400',
      bgGlow: 'bg-transparent',
    };
  };

  // Animation effect
  useEffect(() => {
    if (caloriesConsumed > prevCaloriesRef.current && plan) {
      mascotControls.start({
        scale: [1, 1.08, 1],
        transition: { duration: 0.4, ease: 'easeOut' },
      });
    }
    prevCaloriesRef.current = caloriesConsumed;
  }, [caloriesConsumed, mascotControls, plan]);

  // Show temporary message only on positive threshold crossings
  useEffect(() => {
    if (viewMode !== 'daily') {
      prevProgressRef.current = progress;
      return;
    }

    const prevProgress = prevProgressRef.current;
    const currentProgress = progress;

    // Only trigger on upward threshold crossings
    if (prevProgress < 30 && currentProgress >= 30) {
      setTempMessage({
        text: "Getting stronger",
        emoji: '💪',
      });
      const timer = setTimeout(() => setTempMessage(null), 1500);
      prevProgressRef.current = currentProgress;
      return () => clearTimeout(timer);
    }

    if (prevProgress < 70 && currentProgress >= 70) {
      setTempMessage({
        text: "You're on fire",
        emoji: '🔥',
      });
      const timer = setTimeout(() => setTempMessage(null), 1500);
      prevProgressRef.current = currentProgress;
      return () => clearTimeout(timer);
    }

    prevProgressRef.current = currentProgress;
  }, [progress, viewMode]);

  // Loading state
  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your plan...</p>
        </div>
      </div>
    );
  }

  // Add food to log
  const addFood = (food: FoodItem) => {
    const entry: FoodLogEntry = {
      id: `${food.id}-${Date.now()}`,
      name: food.name,
      kcal: food.kcal,
      emoji: food.emoji,
      timestamp: Date.now(),
      ingredients: food.ingredients,
    };
    setFoodLog((prev) => [entry, ...prev]);
    setSearchQuery('');
    setShowSearch(false);
  };

  // Toggle ingredient breakdown expansion
  const toggleExpanded = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  // Add manual entry
  const addManualEntry = () => {
    const kcal = parseInt(manualCalories);
    if (isNaN(kcal) || kcal <= 0) return;

    const entry: FoodLogEntry = {
      id: `manual-${Date.now()}`,
      name: manualName.trim() || 'Custom food',
      kcal,
      emoji: '🍽️',
      timestamp: Date.now(),
    };
    setFoodLog((prev) => [entry, ...prev]);
    setManualCalories('');
    setManualName('');
    setShowManualEntry(false);
  };

  // Remove food from log
  const removeFood = (id: string) => {
    setFoodLog((prev) => prev.filter((entry) => entry.id !== id));
  };

  // Update weight
  const updateWeight = () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) return;

    const newEntry = {
      weight,
      date: new Date().toISOString(),
    };

    const updatedHistory = [...weightHistory, newEntry];
    setWeightHistory(updatedHistory);
    localStorage.setItem('weightHistory', JSON.stringify(updatedHistory));

    setNewWeight('');
    setShowWeightModal(false);
  };

  // Get current weight (latest entry or starting weight)
  const currentWeight = weightHistory.length > 0
    ? weightHistory[weightHistory.length - 1].weight
    : startingWeight;

  // Get total weight gained
  const weightGained = currentWeight - startingWeight;

  // Get last updated date
  const lastWeightUpdate = weightHistory.length > 0
    ? new Date(weightHistory[weightHistory.length - 1].date)
    : null;

  const getMotivationText = () => {
    const percentage = (caloriesConsumed / totalTarget) * 100;
    if (percentage >= 100) return { main: 'Amazing work today!', highlight: "You've crushed your goal!" };
    if (percentage >= 75) return { main: 'Almost there!', highlight: 'Keep pushing!' };
    if (percentage >= 50) return { main: 'Halfway there!', highlight: "You're doing great!" };
    return { main: 'Your capy buddy is ready for a big meal.', highlight: "Let's fuel up together!" };
  };

  const motivation = getMotivationText();
  const mascotState = getMascotState();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-sm min-h-screen bg-[#F8F9FA] flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex items-center justify-between">
          {/* Streak Indicator */}
          <motion.div
            key={streak}
            initial={{ scale: 1 }}
            animate={streak > prevStreak ? {
              scale: [1, 1.2, 1],
              transition: { duration: 0.4, ease: 'easeOut' }
            } : {}}
            className="flex items-center gap-2"
          >
            <span className="text-2xl">🔥</span>
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {streak}
            </span>
          </motion.div>

          <h1 className="text-2xl font-bold text-orange-600 tracking-tight">
            BULKINE
          </h1>

          <button className="w-10 h-10 flex items-center justify-center text-gray-500">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </header>

        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Calorie Display */}
            <div className="px-6 pb-6 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <motion.span
              key={caloriesConsumed}
              initial={{ scale: 1.1, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-6xl font-bold text-gray-900 tabular-nums"
            >
              {caloriesConsumed}
            </motion.span>
            <span className="text-3xl text-gray-400 font-normal">
              /{totalTarget}
            </span>
          </div>
          <p className="text-orange-600 font-bold text-sm tracking-wide mt-1">
            KCAL CONSUMED
          </p>

          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-orange-500 rounded-full"
            />
          </div>

          {/* Context Text */}
          <p className="text-xs text-gray-500 mt-2">
            Includes +{surplus} kcal surplus for muscle gain
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="px-6 pb-4 flex justify-center">
          <div className="inline-flex bg-white rounded-full p-1 shadow-sm">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                viewMode === 'daily'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('overall')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                viewMode === 'overall'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overall
            </button>
          </div>
        </div>

        {/* Mascot Section with Gamification */}
        <div className="px-6 pb-2 flex flex-col items-center">
          {/* Mascot with dynamic state */}
          <div className="relative">
            {/* Background glow effect */}
            <motion.div
              key={`glow-${viewMode}-${mascotState.level}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`absolute inset-0 rounded-full blur-2xl ${mascotState.bgGlow}`}
            />

            {/* Fixed container to prevent layout shift */}
            <div className="relative w-56 h-56 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-${mascotState.level}`}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: {
                      opacity: { duration: 0.25, ease: 'easeOut' },
                      scale: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
                    }
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    transition: {
                      duration: 0.2,
                      ease: 'easeIn'
                    }
                  }}
                  className={`relative ${mascotState.size}`}
                  style={{
                    filter: mascotState.glow,
                  }}
                >
                  <motion.div
                    animate={mascotControls}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={mascotState.image}
                      alt="Capybara mascot"
                      fill
                      className="object-contain"
                      priority
                    />
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {/* Floating temporary feedback message - below mascot */}
              <AnimatePresence>
                {tempMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 0.7, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.3 }}
                    className="absolute z-20 flex items-center gap-1.5 whitespace-nowrap"
                    style={{
                      bottom: '-10px',
                      left: 0,
                      right: 0,
                      margin: '0 auto',
                      width: 'fit-content',
                      textAlign: 'center'
                    }}
                  >
                    <span className="text-base">{tempMessage.emoji}</span>
                    <span className="text-[13px] font-medium text-gray-600">
                      {tempMessage.text}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Motivation Text */}
        <div className="px-6 pb-6 text-center">
          <motion.p
            key={motivation.main}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-lg font-bold text-gray-900 leading-tight"
          >
            {motivation.main}{' '}
            <span className="text-orange-600">{motivation.highlight}</span>
          </motion.p>
        </div>

        {/* Calorie Remaining */}
        <div className="px-6 pb-6 text-center">
          <p className="text-base text-gray-600">
            You need{' '}
            <motion.span
              key={caloriesConsumed}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="font-bold text-orange-600"
            >
              {Math.max(0, totalTarget - caloriesConsumed)} kcal
            </motion.span>
            {' '}more today
          </p>
        </div>

        {/* Food Logging Section */}
        <div className="px-6 pb-6">
          <h2 className="text-xs font-bold text-gray-400 tracking-widest mb-3">
            LOG YOUR FOOD
          </h2>

          {/* Search Input */}
          <div className="relative mb-3">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                placeholder="What did you eat?"
                className="w-full px-4 py-3.5 pl-11 bg-white rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearch && searchQuery && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg overflow-hidden z-20"
                >
                  {searchResults.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => addFood(food)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <span className="text-2xl">{food.emoji}</span>
                      <span className="flex-1 text-left font-medium text-gray-900">
                        {food.name}
                      </span>
                      <span className="text-sm font-bold text-orange-500">
                        {food.kcal} kcal
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Click away to close */}
            {showSearch && searchQuery && (
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSearch(false)}
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowManualEntry(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-5 h-5 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add manually
            </button>
          </div>

          {/* Manual Entry Modal */}
          <AnimatePresence>
            {showManualEntry && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
                onClick={() => setShowManualEntry(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-3xl p-6 w-full max-w-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Add calories manually
                  </h3>

                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Food name (optional)"
                    className="w-full px-4 py-3 bg-gray-100 rounded-xl mb-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  <input
                    type="number"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="Calories (kcal)"
                    className="w-full px-4 py-3 bg-gray-100 rounded-xl mb-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowManualEntry(false)}
                      className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addManualEntry}
                      disabled={!manualCalories || parseInt(manualCalories) <= 0}
                      className="flex-1 py-3 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Today's Food Log */}
          {foodLog.length > 0 && (
            <div className="mt-2">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-3">
                TODAY
              </h3>
              <div className="space-y-2">
                {foodLog.map((entry) => {
                  const isExpanded = expandedEntries.has(entry.id);
                  const hasIngredients = entry.ingredients && entry.ingredients.length > 0;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-white rounded-xl overflow-hidden"
                    >
                      {/* Main entry row */}
                      <div
                        className={`flex items-center gap-3 p-3 ${hasIngredients ? 'cursor-pointer' : ''}`}
                        onClick={() => hasIngredients && toggleExpanded(entry.id)}
                      >
                        <span className="text-2xl">{entry.emoji}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{entry.name}</p>
                          <p className="text-sm text-orange-500 font-semibold">
                            {entry.kcal} kcal
                          </p>
                        </div>

                        {/* Expand indicator for composite foods */}
                        {hasIngredients && (
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-6 h-6 flex items-center justify-center text-gray-400"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </motion.div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFood(entry.id);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Ingredient breakdown (expandable) */}
                      <AnimatePresence>
                        {isExpanded && hasIngredients && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                              <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">
                                Breakdown
                              </p>
                              <div className="space-y-1.5 pl-2">
                                {entry.ingredients?.map((ingredient, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-gray-600">
                                      {ingredient.name}
                                    </span>
                                    <span className="text-gray-400 font-medium tabular-nums">
                                      {ingredient.kcal} kcal
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {foodLog.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">
                No food logged yet today.
                <br />
                Search above to add your meals!
              </p>
            </div>
          )}
        </div>
          </>
        )}

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div className="px-6 pt-4 pb-6 flex-1">
            {/* Profile Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-3">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Your Profile</h2>
            </div>

            {/* Progress Section */}
            <div className="bg-white rounded-2xl p-5 mb-4">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-4">
                YOUR PROGRESS
              </h3>

              <div className="space-y-4">
                {/* Starting Weight */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Starting weight</span>
                  <span className="font-bold text-gray-900">{startingWeight} kg</span>
                </div>

                {/* Current Weight */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current weight</span>
                  <span className="font-bold text-gray-900">{currentWeight} kg</span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Total Gain */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total change</span>
                  <span className={`font-bold ${weightGained >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {weightGained >= 0 ? '+' : ''}{weightGained.toFixed(1)} kg
                  </span>
                </div>

                {/* Last Updated */}
                {lastWeightUpdate && (
                  <p className="text-xs text-gray-400 text-center pt-2">
                    Last updated: {lastWeightUpdate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Update Weight Button */}
            <button
              onClick={() => setShowWeightModal(true)}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Update weight
            </button>

            {/* Stats Section */}
            <div className="mt-6 bg-white rounded-2xl p-5">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-4">
                STATS
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-orange-500">🔥 {streak}</p>
                  <p className="text-xs text-gray-500 mt-1">Day streak</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{weightHistory.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Weigh-ins</p>
                </div>
              </div>
            </div>

            {/* Update Weight Modal */}
            <AnimatePresence>
              {showWeightModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
                  onClick={() => setShowWeightModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Update your weight
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Track your progress by logging your current weight.
                    </p>

                    <div className="relative mb-4">
                      <input
                        type="number"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder={`Current: ${currentWeight} kg`}
                        step="0.1"
                        className="w-full px-4 py-3 pr-12 bg-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                        kg
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowWeightModal(false)}
                        className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateWeight}
                        disabled={!newWeight || parseFloat(newWeight) <= 0}
                        className="flex-1 py-3 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Bottom padding for fixed nav */}
        <div className="h-24" />

        {/* Fixed Bottom Navigation - Floating Pill Style */}
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-6 bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg shadow-gray-900/10">
            {[
              { id: 'dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'workouts', label: 'Workout', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
              { id: 'nutrition', label: 'Food', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
              { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex flex-col items-center gap-0.5 transition-all duration-200
                  ${activeTab === tab.id
                    ? 'text-orange-500 scale-105'
                    : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={activeTab === tab.id ? 2.5 : 2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={tab.icon}
                  />
                </svg>
                <span className={`text-[10px] font-semibold ${activeTab === tab.id ? 'text-orange-500' : ''}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
