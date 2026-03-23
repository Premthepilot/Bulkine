'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { WeeklyPlanOutput } from '@/lib/diet-engine';
import { searchFoods, type FoodItem, type Ingredient } from '@/lib/food-database';
import {
  getUserProfile,
  getFoodLogsByDate,
  addFoodLog,
  deleteFoodLog,
  getWeightHistory,
  addWeightEntry,
  updateStreak,
  migrateLocalStorageData,
  syncUserData,
  getCurrentUser
} from '@/lib/supabase-data';
import { supabase } from '@/lib/supabase';

interface FoodLogEntry {
  id: string;
  name: string;
  kcal: number;
  emoji: string;
  timestamp: number;
  ingredients?: Ingredient[];
}

function DashboardPageClient() {
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
  const [showCelebration, setShowCelebration] = useState<{ level: number; message: string } | null>(null);

  // DEV ONLY: Test override for weight progress
  const [testWeightProgress, setTestWeightProgress] = useState<number | null>(null);

  // Streak tracking state (client-side only)
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const [calculatedStreak, setCalculatedStreak] = useState(0);

  // Weight tracking state
  const [weightHistory, setWeightHistory] = useState<{ weight: number; date: string }[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [startingWeight, setStartingWeight] = useState(0);
  const [goalWeight, setGoalWeight] = useState(0);

  // Supabase-specific state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Logout state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mascotControls = useAnimation();
  const prevCaloriesRef = useRef<number>(0);
  const prevProgressRef = useRef<number>(0);
  const prevWeightProgressRef = useRef<number>(0);

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

  // Load user data from Supabase on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user (routing is handled by home page, so user should be authenticated)
        const user = await getCurrentUser();
        if (!user) {
          // This should not happen with proper routing, but handle gracefully
          console.warn('Dashboard accessed without authentication');
          setLoading(false);
          return;
        }

        // Load user profile from Supabase (only has: user_id, weight, calories, streak)
        const profile = await getUserProfile();

        // Load plan and other data from localStorage
        const storedPlan = localStorage.getItem('userPlan');
        const storedOnboarding = localStorage.getItem('onboardingData');
        const userPlan = storedPlan ? JSON.parse(storedPlan) : null;
        const onboardingData = storedOnboarding ? JSON.parse(storedOnboarding) : null;

        if (!userPlan) {
          console.warn('Dashboard accessed without plan data');
          setLoading(false);
          return;
        }

        setUserProfile(profile);
        setPlan(userPlan);
        setStartingWeight(profile?.weight || onboardingData?.weight || 0);
        setGoalWeight(onboardingData?.goalWeight || 0);
        setStreak(profile?.streak || 1);

        // Load today's food log
        const today = new Date().toISOString().split('T')[0];
        const todaysFoodLogs = await getFoodLogsByDate(today);

        // Convert Supabase food logs to local format
        const formattedLogs = todaysFoodLogs.map((log: { id: string; food_name: string; kcal: number; emoji: string | null; logged_at: string; ingredients: Ingredient[] | null }) => ({
          id: log.id,
          name: log.food_name,
          kcal: log.kcal,
          emoji: log.emoji || '🍽️',
          timestamp: new Date(log.logged_at).getTime(),
          ingredients: log.ingredients || []
        }));

        setFoodLog(formattedLogs);

        // Load weight history
        const weightData = await getWeightHistory();
        const formattedWeightHistory = weightData.map((entry: { weight: number | string; recorded_date: string }) => ({
          weight: parseFloat(entry.weight.toString()),
          date: entry.recorded_date
        }));
        setWeightHistory(formattedWeightHistory);

        // Handle daily reset - show welcome message for new day
        const today_date = new Date();
        const lastVisitKey = 'lastDashboardVisit';
        const lastVisit = localStorage.getItem(lastVisitKey);
        const todayStr = today_date.toISOString().split('T')[0];

        if (lastVisit !== todayStr) {
          // New day detected - show welcome message
          setTempMessage({
            text: "New day. Let's grow",
            emoji: '💪',
          });
          setTimeout(() => setTempMessage(null), 2000);
          localStorage.setItem(lastVisitKey, todayStr);
        }

      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []); // Removed router dependency since we're not using redirects

  // Handle streak updates when food is logged
  useEffect(() => {
    const handleStreakUpdate = async () => {
      if (foodLog.length === 0) return;

      const today = new Date().toISOString().split('T')[0];
      const lastLogDateKey = 'lastFoodLogDate';
      const lastLogDate = localStorage.getItem(lastLogDateKey);

      // Check if this is the first log today
      if (!lastLogDate || lastLogDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (lastLogDate === yesterdayStr) {
          // Logged yesterday, increment streak
          newStreak = streak + 1;
        }

        setPrevStreak(streak);
        setStreak(newStreak);
        localStorage.setItem(lastLogDateKey, today);

        // Update streak in database
        try {
          const updatedProfile = await updateStreak(newStreak);
          setUserProfile(updatedProfile);
        } catch (error) {
          console.error('Error updating streak:', error);
        }
      }
    };

    handleStreakUpdate();
  }, [foodLog.length]); // Only trigger when food log length changes

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

  // Get current weight (latest entry or starting weight)
  const currentWeight = weightHistory.length > 0
    ? weightHistory[weightHistory.length - 1].weight
    : startingWeight;

  // Calculate weight progress for overall mode (milestone-based)
  const calculatedWeightProgress = goalWeight > startingWeight
    ? Math.min(Math.max(((currentWeight - startingWeight) / (goalWeight - startingWeight)) * 100, 0), 100)
    : 0;

  // Use test override if set, otherwise use calculated value
  const weightProgress = testWeightProgress !== null ? testWeightProgress : calculatedWeightProgress;

  // Calculate display progress - snaps to milestone markers for clean visual alignment
  const getDisplayProgress = (progress: number) => {
    if (progress >= 100) return 100;
    if (progress >= 75) return 75;
    if (progress >= 50) return 50;
    if (progress >= 25) return 25;
    return 0;
  };

  const displayProgress = getDisplayProgress(weightProgress);

  // Calculate completed dates and streak from Supabase data
  useEffect(() => {
    const calculateStreakHistory = async () => {
      if (!userProfile || totalTarget === 0) return;

      try {
        const dates: string[] = [];
        const today = new Date();

        // Check last 90 days
        for (let i = 0; i < 90; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          // Get food logs for this date
          const dayFoodLogs = await getFoodLogsByDate(dateStr);
          const dayCalories = dayFoodLogs.reduce((sum: number, entry: { kcal: number }) => sum + entry.kcal, 0);

          // Day is completed if >= 80% of goal
          if (dayCalories >= (totalTarget * 0.8)) {
            dates.push(date.toDateString()); // Convert to display format for UI compatibility
          }
        }

        setCompletedDates(dates);

        // Calculate current streak based on consecutive completed days
        let calculatedStreak = 0;
        for (let i = 0; i < 90; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toDateString();

          if (dates.includes(dateStr)) {
            calculatedStreak++;
          } else {
            break;
          }
        }
        setCalculatedStreak(calculatedStreak);

      } catch (error) {
        console.error('Error calculating streak history:', error);
      }
    };

    calculateStreakHistory();
  }, [totalTarget, userProfile?.id]); // Recalculate when user profile or target changes

  // Get mascot state based on progress
  const getMascotState = () => {
    if (viewMode === 'overall') {
      // Overall view: based on weight progress milestones
      if (weightProgress >= 75) {
        return {
          level: 'strong' as const,
          image: '/mascot/capy-strong.png',
          size: 'w-56 h-56',
          glow: 'drop-shadow(0 0 24px rgba(249, 115, 22, 0.35))',
          statusText: "You're almost there",
          statusEmoji: '🏆',
          statusColor: 'text-orange-500',
          bgGlow: 'bg-orange-500/10',
        };
      }
      if (weightProgress >= 50) {
        return {
          level: 'improving' as const,
          image: '/mascot/capy-improving.png',
          size: 'w-52 h-52',
          glow: 'drop-shadow(0 0 16px rgba(249, 115, 22, 0.2))',
          statusText: "Looking stronger",
          statusEmoji: '💪',
          statusColor: 'text-gray-600',
          bgGlow: 'bg-orange-500/5',
        };
      }
      if (weightProgress >= 25) {
        return {
          level: 'improving' as const,
          image: '/mascot/capy-improving.png',
          size: 'w-50 h-50',
          glow: 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.15))',
          statusText: "Building momentum",
          statusEmoji: '📈',
          statusColor: 'text-gray-500',
          bgGlow: 'bg-orange-500/5',
        };
      }
      return {
        level: 'weak' as const,
        image: '/mascot/capy-workout.png',
        size: 'w-48 h-48',
        glow: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
        statusText: "Just getting started",
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

  // Show celebration on milestone threshold crossings (Overall mode only)
  useEffect(() => {
    if (viewMode !== 'overall') {
      prevWeightProgressRef.current = weightProgress;
      return;
    }

    const prevProgress = prevWeightProgressRef.current;
    const currentProgress = weightProgress;

    // Define weight milestones with messages
    const milestones = [
      { threshold: 25, level: 1, message: "Building momentum" },
      { threshold: 50, level: 2, message: "Looking stronger" },
      { threshold: 75, level: 3, message: "You're almost there" },
      { threshold: 100, level: 4, message: "Goal achieved!" },
    ];

    // Check for milestone crossings (upward only)
    for (const milestone of milestones) {
      if (prevProgress < milestone.threshold && currentProgress >= milestone.threshold) {
        // Trigger celebration
        setShowCelebration({ level: milestone.level, message: milestone.message });

        // Animate mascot
        mascotControls.start({
          scale: [1, 1.1, 1],
          transition: { duration: 0.5, ease: 'easeOut' },
        });

        // Auto dismiss after 1.5s
        const timer = setTimeout(() => setShowCelebration(null), 1500);
        prevWeightProgressRef.current = currentProgress;
        return () => clearTimeout(timer);
      }
    }

    prevWeightProgressRef.current = currentProgress;
  }, [weightProgress, viewMode, mascotControls]);

  // Add food to log
  const addFood = async (food: FoodItem) => {
    const entry: FoodLogEntry = {
      id: `${food.id}-${Date.now()}`,
      name: food.name,
      kcal: food.kcal,
      emoji: food.emoji,
      timestamp: Date.now(),
      ingredients: food.ingredients,
    };

    try {
      setSaving(true);

      // Optimistic update
      setFoodLog((prev) => [entry, ...prev]);
      setSearchQuery('');
      setShowSearch(false);

      // Save to Supabase
      await addFoodLog({
        name: food.name,
        kcal: food.kcal,
        emoji: food.emoji,
        ingredients: food.ingredients
      });

    } catch (error) {
      console.error('Error adding food:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add food entry';
      setError(errorMessage);
      // Revert optimistic update
      setFoodLog((prev) => prev.filter(item => item.id !== entry.id));
    } finally {
      setSaving(false);
    }
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
  const addManualEntry = async () => {
    const kcal = parseInt(manualCalories);
    if (isNaN(kcal) || kcal <= 0) return;

    const entry: FoodLogEntry = {
      id: `manual-${Date.now()}`,
      name: manualName.trim() || 'Custom food',
      kcal,
      emoji: '🍽️',
      timestamp: Date.now(),
    };

    try {
      setSaving(true);

      // Optimistic update
      setFoodLog((prev) => [entry, ...prev]);
      setManualCalories('');
      setManualName('');
      setShowManualEntry(false);

      // Save to Supabase
      await addFoodLog({
        name: entry.name,
        kcal: entry.kcal,
        emoji: entry.emoji,
        ingredients: []
      });

    } catch (error) {
      console.error('Error adding manual entry:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add manual entry';
      setError(errorMessage);
      // Revert optimistic update
      setFoodLog((prev) => prev.filter(item => item.id !== entry.id));
    } finally {
      setSaving(false);
    }
  };

  // Remove food from log
  const removeFood = async (id: string) => {
    const entryToRemove = foodLog.find(entry => entry.id === id);
    if (!entryToRemove) return;

    try {
      setSaving(true);

      // Optimistic update
      setFoodLog((prev) => prev.filter((entry) => entry.id !== id));

      // Find the database ID (if it exists in Supabase format)
      if (!id.startsWith('manual-') && !id.includes('-')) {
        // This is a database ID
        await deleteFoodLog(id);
      } else {
        // This is a local ID, need to find the corresponding database entry
        // For now, we'll just keep the optimistic update
        console.log('Removed locally generated entry');
      }

    } catch (error) {
      console.error('Error removing food:', error);
      setError('Failed to remove food entry');
      // Revert optimistic update
      if (entryToRemove) {
        setFoodLog((prev) => [entryToRemove, ...prev]);
      }
    } finally {
      setSaving(false);
    }
  };

  // Update weight
  const updateWeight = async () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) return;

    const newEntry = {
      weight,
      date: new Date().toISOString().split('T')[0],
    };

    try {
      setSaving(true);

      // Optimistic update
      const updatedHistory = [...weightHistory, newEntry];
      setWeightHistory(updatedHistory);
      setNewWeight('');
      setShowWeightModal(false);

      // Save to Supabase
      await addWeightEntry(weight);

      // Get fresh weight history to ensure consistency
      const freshWeightHistory = await getWeightHistory();
      const formattedWeightHistory = freshWeightHistory.map((entry: { weight: number | string; recorded_date: string }) => ({
        weight: parseFloat(entry.weight.toString()),
        date: entry.recorded_date
      }));
      setWeightHistory(formattedWeightHistory);

    } catch (error) {
      console.error('Error updating weight:', error);
      setError('Failed to update weight');
      // Revert optimistic update
      setWeightHistory(weightHistory);
      setShowWeightModal(true);
    } finally {
      setSaving(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      console.log('Logging out user...');

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error.message);
        throw error;
      }

      console.log('Logout successful, redirecting to home');

      // Redirect to home/opening page
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      setError(errorMessage);
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  // Get total weight gained
  const weightGained = currentWeight - startingWeight;

  // Get last updated date
  const lastWeightUpdate = weightHistory.length > 0
    ? new Date(weightHistory[weightHistory.length - 1].date)
    : null;

  const getMotivationText = () => {
    // Overall mode: milestone-based motivation
    if (viewMode === 'overall') {
      if (weightProgress >= 75) return { main: "You're almost there", highlight: '' };
      if (weightProgress >= 50) return { main: "Looking stronger", highlight: '' };
      if (weightProgress >= 25) return { main: "Building momentum", highlight: '' };
      return { main: "Just getting started", highlight: '' };
    }

    // Daily mode: Based on today's progress
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
        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your data...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && (
        <>
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex items-center justify-between">
          {activeTab === 'streaks' ? (
            /* Streaks Page Header */
            <div className="w-full">
              <h1 className="text-xl font-semibold text-gray-900">
                Streaks
              </h1>
            </div>
          ) : (
            /* Default Header */
            <>
              {/* Streak Indicator - hide on streaks page to avoid duplicate */}
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

              <div className="flex items-center gap-2">
                {/* Saving indicator */}
                {saving && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-blue-600">Saving...</span>
                  </div>
                )}

                <button className="w-10 h-10 flex items-center justify-center text-gray-500">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                </button>
              </div>
            </>
          )}
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
            {motivation.highlight && (
              <span className="text-orange-600">{motivation.highlight}</span>
            )}
          </motion.p>
          {viewMode === 'overall' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mt-4"
            >
              {/* Weight Progress Bar */}
              <div className="relative mt-2">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${displayProgress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full bg-gradient-to-r from-orange-400 to-orange-500 ${
                      displayProgress === 100 ? 'rounded-full' : 'rounded-l-full'
                    }`}
                  />
                </div>
                {/* Milestone markers */}
                <div className="absolute top-0 left-0 right-0 h-3 flex items-center">
                  <div className="absolute left-1/4 w-0.5 h-3 bg-gray-300" />
                  <div className="absolute left-1/2 w-0.5 h-3 bg-gray-300" />
                  <div className="absolute left-3/4 w-0.5 h-3 bg-gray-300" />
                </div>
              </div>
              {/* Progress info */}
              <div className="flex justify-between items-center mt-3 text-sm">
                <span className="text-gray-500">{startingWeight} kg</span>
                <span className="font-bold text-orange-600">{Math.round(weightProgress)}%</span>
                <span className="text-gray-500">{goalWeight} kg</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Current: {currentWeight} kg
              </p>

              {/* DEV ONLY: Test milestone triggers */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                  <p className="text-[10px] font-bold text-yellow-800 mb-2">⚠️ DEV: Test Milestones</p>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => {
                        prevWeightProgressRef.current = 0;
                        setTestWeightProgress(26);
                      }}
                      className="flex-1 py-1.5 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 text-xs font-semibold rounded-lg"
                    >
                      Test 25%
                    </button>
                    <button
                      onClick={() => {
                        prevWeightProgressRef.current = 0;
                        setTestWeightProgress(51);
                      }}
                      className="flex-1 py-1.5 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 text-xs font-semibold rounded-lg"
                    >
                      Test 50%
                    </button>
                    <button
                      onClick={() => {
                        prevWeightProgressRef.current = 0;
                        setTestWeightProgress(76);
                      }}
                      className="flex-1 py-1.5 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 text-xs font-semibold rounded-lg"
                    >
                      Test 75%
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setTestWeightProgress(null);
                      prevWeightProgressRef.current = calculatedWeightProgress;
                    }}
                    className="w-full py-1.5 bg-red-200 hover:bg-red-300 text-red-900 text-xs font-semibold rounded-lg"
                  >
                    Reset to Real Progress
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Calorie Remaining - Only show in daily mode */}
        {viewMode === 'daily' && (
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
        )}

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

            {/* Logout Button */}
            <div className="mt-6">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-3.5 bg-white hover:bg-red-50 text-red-600 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 border-2 border-red-200"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>

            {/* Logout Confirmation Modal */}
            <AnimatePresence>
              {showLogoutConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
                  onClick={() => !loggingOut && setShowLogoutConfirm(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Logout?
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                      Are you sure you want to logout? You can always log back in anytime.
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowLogoutConfirm(false)}
                        disabled={loggingOut}
                        className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loggingOut ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Logging out...
                          </>
                        ) : (
                          'Logout'
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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

        {/* Streaks Tab Content */}
        {activeTab === 'streaks' && (
          <div className="px-6 pt-4 pb-6 flex-1">
            {/* Streak Hero Section - Compact */}
            <div className="mb-6">
              <div className="bg-white rounded-3xl p-6 text-center shadow-sm">
                {/* Flame + Number Row */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex items-center justify-center gap-3 mb-2"
                >
                  {/* Flame with subtle glow */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-400/20 rounded-full blur-xl scale-150" />
                    <span className="relative text-5xl">🔥</span>
                  </div>

                  {/* Streak Number */}
                  <span className="text-6xl font-black text-gray-900 tracking-tight">
                    {calculatedStreak}
                  </span>
                </motion.div>

                {/* Streak Label */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-lg font-bold text-gray-500 mb-1"
                >
                  {calculatedStreak === 1 ? 'Day Streak' : 'Days Streak'}
                </motion.p>

                {/* Motivational Message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="text-base font-semibold text-gray-700"
                >
                  {calculatedStreak >= 7
                    ? "Keep it going ✨"
                    : calculatedStreak >= 3
                    ? "Building momentum ✨"
                    : calculatedStreak >= 1
                    ? "Great start ✨"
                    : "Let's start again ✨"
                  }
                </motion.p>
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl p-5">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-4 text-center">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
              </h3>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {/* Day headers */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={index} className="text-center text-xs font-bold text-gray-400 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {Array.from({ length: 42 }, (_, index) => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  const startCalendar = new Date(firstDay);
                  startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());

                  const currentDate = new Date(startCalendar);
                  currentDate.setDate(currentDate.getDate() + index);

                  const isCurrentMonth = currentDate.getMonth() === today.getMonth();
                  const isToday = currentDate.toDateString() === today.toDateString();
                  const isCompleted = completedDates.includes(currentDate.toDateString());

                  return (
                    <div
                      key={index}
                      className={`
                        aspect-square flex items-center justify-center text-sm font-medium rounded-lg relative
                        ${!isCurrentMonth
                          ? 'text-gray-300'
                          : isCompleted
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-600'
                        }
                        ${isToday ? 'ring-2 ring-orange-300' : ''}
                      `}
                    >
                      {currentDate.getDate()}

                      {/* Completion indicator */}
                      {isCompleted && isCurrentMonth && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 bg-orange-500 rounded-lg flex items-center justify-center"
                        >
                          <span className="text-white font-bold">{currentDate.getDate()}</span>
                        </motion.div>
                      )}

                      {/* Today indicator */}
                      {isToday && !isCompleted && (
                        <div className="absolute inset-0 rounded-lg ring-2 ring-orange-500 ring-offset-1" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-xs text-gray-500 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-orange-500 rounded-full" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-200 rounded-full" />
                  <span>Missed</span>
                </div>
              </div>
            </div>

            {/* Streak Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">{completedDates.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total completed</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((completedDates.length / Math.min(90, Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24)))) * 100) || 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Success rate</p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom padding for fixed nav */}
        <div className="h-24" />

        {/* Fixed Bottom Navigation - Floating Pill Style */}
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-6 bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg shadow-gray-900/10">
            {[
              { id: 'dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'streaks', label: 'Streaks', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
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

        {/* Level Up Celebration Overlay */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="text-center"
              >
                {/* Glow effect */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.6, scale: 1.2 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-orange-500/20 rounded-full blur-3xl"
                />

                {/* Content */}
                <div className="relative">
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl font-bold text-white mb-2"
                  >
                    Level Up
                  </motion.p>
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-6xl mb-3"
                  >
                    🎉
                  </motion.p>
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl text-white/90 font-medium"
                  >
                    {showCelebration.message}
                  </motion.p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* End of Main Content */}
        </>
        )}
      </div>
    </div>
  );
}

const DashboardPage = dynamic(() => Promise.resolve(DashboardPageClient), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading your plan...</p>
      </div>
    </div>
  ),
});

export default DashboardPage;
