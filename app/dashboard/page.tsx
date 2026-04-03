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
  syncUserData,
  getCurrentUser,
  migrateOldLocalStorage
} from '@/lib/local-data';

interface FoodLogEntry {
  id: string;
  name: string;
  kcal: number;
  emoji: string;
  timestamp: number;
  ingredients?: Ingredient[];
}

// Get or create mock user start date (temporary until backend connects)
function getMockUserStartDate(): Date {
  if (typeof window === 'undefined') {
    // Server-side: return a default date
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date;
  }

  const stored = localStorage.getItem('mockUserStartDate');
  if (stored) {
    return new Date(stored);
  }

  // Create a mock start date 3 months ago
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  localStorage.setItem('mockUserStartDate', date.toISOString());

  return date;
}

// Reset mock start date (dev only)
function resetMockUserStartDate(): void {
  if (typeof window !== 'undefined') {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    localStorage.setItem('mockUserStartDate', date.toISOString());
  }
}

// Custom hook for tracking scroll direction and hiding header
// Custom hook for scroll-linked header animation
// Header smoothly slides away as user scrolls, reappears on scroll up
function useScrollLinkedHeader() {
  const [headerStyle, setHeaderStyle] = useState<{ transform: string; opacity: number }>({
    transform: 'translateY(0)',
    opacity: 1,
  });

  useEffect(() => {
    const handleScroll = () => {
      // Clamp scroll value to prevent negative values from scroll bounce
      const scrollY = Math.max(window.scrollY, 0);

      // Calculate progress (0 to 1) over 100px scroll distance
      // At scrollY=0: progress=0 (header fully visible)
      // At scrollY=100: progress=1 (header fully hidden)
      const progress = Math.min(scrollY / 100, 1);

      // Apply continuous transform and opacity based on scroll
      const translateY = -progress * 100;
      const opacity = 1 - progress;

      setHeaderStyle({
        transform: `translateY(${translateY}%)`,
        opacity: Math.max(opacity, 0),
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return headerStyle;
}

function DashboardPageClient() {
  const router = useRouter();
  const [plan, setPlan] = useState<WeeklyPlanOutput | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Scroll-linked header animation
  const headerStyle = useScrollLinkedHeader();

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

  // Calendar state - single month view
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  // Floating menu state
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  // Handle scroll lock when menu is open
  useEffect(() => {
    if (showFloatingMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showFloatingMenu]);

  // Mascot motivational messages rotation
  const motivationalMessages = [
    "Your capy buddy is ready for a big meal. Let's fuel up together!",
    "Time to hit your calories — your buddy is waiting!",
    "Big gains start with big meals. Let's go!",
    "Fuel your body, build your strength.",
    "Consistency today = results tomorrow.",
    "Let's make today count — one meal at a time.",
    "You've got this, one calorie at a time!",
    "Hunger is the best sauce — let's feast!"
  ];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
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

  // Rotate motivational messages
  useEffect(() => {
    // Pick a random message on mount
    setCurrentMessageIndex(Math.floor(Math.random() * motivationalMessages.length));

    // Set up rotation interval (rotate every 6 seconds)
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % motivationalMessages.length);
    }, 6000);

    // Cleanup
    return () => clearInterval(interval);
  }, [motivationalMessages.length]);

  // Load user data from local storage on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Migrate old localStorage format if needed
        await migrateOldLocalStorage();

        // Get current user (local)
        const user = await getCurrentUser();
        console.log('[Dashboard] Current user:', user ? { id: user.id, email: user.email } : 'null');

        if (!user) {
          console.warn('[Dashboard] No authenticated user');
          setLoading(false);
          return;
        }

        // Load user profile from Supabase (source of truth for: weight, calories, streak)
        const profile = await getUserProfile();
        console.log('[Dashboard] Profile from DB:', profile);

        // Load plan from localStorage (generated client-side)
        const storedPlan = localStorage.getItem('userPlan');
        const storedOnboarding = localStorage.getItem('onboardingData');
        const userPlan = storedPlan ? JSON.parse(storedPlan) : null;
        const onboardingData = storedOnboarding ? JSON.parse(storedOnboarding) : null;

        // If no plan but user has profile, create a basic plan from DB values
        const effectivePlan = userPlan || (profile ? {
          targetCalories: profile.calories || 2500,
          surplus: 300,
          meals: []
        } : null);

        if (!effectivePlan && !profile) {
          console.warn('[Dashboard] No plan or profile data available');
          setLoading(false);
          return;
        }

        setUserProfile(profile);
        setPlan(effectivePlan);

        // Use database values as source of truth
        setStartingWeight(profile?.weight || onboardingData?.weight || 0);
        setGoalWeight(onboardingData?.goalWeight || (profile?.weight ? profile.weight + 10 : 70));
        setStreak(profile?.streak || 1);

        // Load today's food log from Supabase
        const today = new Date().toISOString().split('T')[0];
        const todaysFoodLogs = await getFoodLogsByDate(today);
        console.log('[Dashboard] Today\'s food logs:', todaysFoodLogs.length, 'entries');

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

        // Load weight history from Supabase
        const weightData = await getWeightHistory();
        console.log('[Dashboard] Weight history:', weightData.length, 'entries');

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
          setTempMessage({
            text: "New day. Let's grow",
            emoji: '💪',
          });
          setTimeout(() => setTempMessage(null), 2000);
          localStorage.setItem(lastVisitKey, todayStr);
        }

      } catch (err) {
        console.error('[Dashboard] Error loading user data:', err);
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

  // Delay focus until after modal animation completes (allows smooth animation on mobile)
  useEffect(() => {
    if (showManualEntry && nameInputRef.current) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [showManualEntry]);

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

  // Calculate completed dates and streak from Supabase data and generate months
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

  // Generate months from user creation date to future months
  useEffect(() => {
    // Use mock start date if backend data not available
    const startDate = userProfile?.created_at ? new Date(userProfile.created_at) : getMockUserStartDate();
    // Initialize to current month on load
    setCurrentMonth(new Date());
  }, [userProfile?.created_at]);

  // Navigation handlers for month switching
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

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
      const savedEntry = await addFoodLog({
        name: food.name,
        kcal: food.kcal,
        emoji: food.emoji,
        ingredients: food.ingredients
      });

      // Replace optimistic update with real entry from database
      setFoodLog((prev) => [
        {
          id: savedEntry.id,
          name: savedEntry.food_name,
          kcal: savedEntry.calories,
          emoji: savedEntry.emoji || '🍽️',
          timestamp: new Date(savedEntry.logged_at).getTime(),
          ingredients: savedEntry.ingredients || []
        },
        ...prev.filter(item => item.id !== entry.id)
      ]);

      // Refresh user profile to get updated calories
      const updatedProfile = await getUserProfile();
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }

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
      const savedEntry = await addFoodLog({
        name: entry.name,
        kcal: entry.kcal,
        emoji: entry.emoji,
        ingredients: []
      });

      // Replace optimistic update with real entry from database
      setFoodLog((prev) => [
        {
          id: savedEntry.id,
          name: savedEntry.food_name,
          kcal: savedEntry.kcal,
          emoji: savedEntry.emoji || '🍽️',
          timestamp: new Date(savedEntry.logged_at).getTime(),
          ingredients: savedEntry.ingredients || []
        },
        ...prev.filter(item => item.id !== entry.id)
      ]);

      // Refresh user profile to get updated calories
      const updatedProfile = await getUserProfile();
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }

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

      // Delete from database
      await deleteFoodLog(id);

      // Refresh user profile to get updated calories
      const updatedProfile = await getUserProfile();
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }

    } catch (error) {
      console.error('Error removing food:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove food entry';
      setError(errorMessage);
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

      // For local storage mode, just redirect to home
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

    // Daily mode: Use rotating messages at lower progress, context-based at higher
    const percentage = (caloriesConsumed / totalTarget) * 100;
    if (percentage >= 100) return { main: 'Amazing work today!', highlight: "You've crushed your goal!" };
    if (percentage >= 75) return { main: 'Almost there!', highlight: 'Keep pushing!' };
    if (percentage >= 50) return { main: 'Halfway there!', highlight: "You're doing great!" };

    // Show rotating messages for early progress
    return { main: motivationalMessages[currentMessageIndex], highlight: '' };
  };

  const motivation = getMotivationText();
  const mascotState = getMascotState();

  return (
    <motion.div
      className="min-h-screen bg-gray-100 flex items-center justify-center"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
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
        {/* Fixed Floating Transparent Header - Scroll-Linked Animation */}
        <header
          className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between will-change-transform"
          style={{
            transform: headerStyle.transform,
            opacity: headerStyle.opacity,
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'none', // No transition - animation is tied to scroll
          }}
        >
          {activeTab === 'streaks' ? (
            /* Streaks Page Header */
            <div className="w-full">
              <h1 className="text-lg font-semibold text-gray-900">
                Streaks
              </h1>
            </div>
          ) : (
            /* Default Header */
            <>
              <h1 className="text-xl font-bold text-orange-600 tracking-tight">
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

                {/* Streak Indicator */}
                <motion.div
                  key={streak}
                  initial={{ scale: 1 }}
                  animate={streak > prevStreak ? {
                    scale: [1, 1.2, 1],
                    transition: { duration: 0.4, ease: 'easeOut' }
                  } : {}}
                  className="flex items-center gap-2 bg-[#f8fafc] px-3 py-1.5 rounded-full border border-gray-200"
                >
                  <span className="text-2xl">🔥</span>
                  <span className="text-2xl font-bold text-gray-900 tabular-nums">
                    {streak}
                  </span>
                </motion.div>
              </div>
            </>
          )}
        </header>

        {/* Content with offset for fixed header */}
        <div className="pt-16">

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
        <div className="px-6 pb-2 pt-2 flex flex-col items-center">
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

        {/* Motivational Quote Text */}
        <div className="px-6 mt-2 text-center h-[52px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={motivation.main}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-bold text-gray-900 leading-tight line-clamp-2"
            >
              {motivation.main}{' '}
              {motivation.highlight && (
                <span className="text-orange-600">{motivation.highlight}</span>
              )}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress Section - Overall Mode Only */}
        {viewMode === 'overall' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="px-6 mt-2 mb-6"
          >
            {/* Weight Progress Bar */}
            <div className="relative">
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

            {/* Progress Stats */}
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-gray-500">{startingWeight} kg</span>
              <span className="font-bold text-orange-600">{Math.round(weightProgress)}%</span>
              <span className="text-gray-500">{goalWeight} kg</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Current: {currentWeight} kg
            </p>
          </motion.div>
        )}

        {/* Calorie Remaining - Only show in daily mode */}
        {viewMode === 'daily' && (
          <div className="px-6 pb-6 mb-6 text-center">
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
          <h2 className="text-xs font-medium text-gray-400 tracking-wide mb-6">
            LOG YOUR FOOD
          </h2>

          {/* Search Input */}
          <div className="relative mb-6">
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
                className="w-full px-5 py-3 pl-12 bg-gray-100/60 rounded-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
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
                  className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md overflow-hidden z-20"
                >
                  {searchResults.map((food, index) => (
                    <button
                      key={food.id}
                      onClick={() => addFood(food)}
                      className={`w-full flex flex-col items-start px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                        index !== searchResults.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-800">
                        {food.name}
                      </span>
                      <span className="text-xs text-orange-500 font-medium mt-1">
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
          <div className="space-y-4">
            <button
              onClick={() => setShowManualEntry(true)}
              className="w-full flex items-center justify-center gap-3 py-3 text-gray-600 font-medium active:scale-95 transition-all"
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

          {/* Today's Food Log */}
          <div className="mt-6">
            <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-3">
              TODAY
            </h3>
            <motion.div
              layout
              className="space-y-2"
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
            >
              {/* Inline Manual Entry Card */}
              <AnimatePresence mode="popLayout">
                {showManualEntry && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -40, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -40, scale: 0.98 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25
                    }}
                    className="bg-white rounded-2xl overflow-hidden p-4"
                  >
                    <div className="flex flex-col gap-3">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Item name"
                        className="w-full text-base font-semibold text-gray-900 placeholder-gray-400 bg-transparent border-b border-gray-200 pb-2 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                      <input
                        type="number"
                        value={manualCalories}
                        onChange={(e) => setManualCalories(e.target.value)}
                        placeholder="Enter kcal"
                        className="w-full text-sm text-orange-500 font-medium placeholder-gray-400 bg-transparent border-b border-gray-200 pb-2 focus:outline-none focus:border-orange-500 transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && manualCalories && parseInt(manualCalories) > 0) {
                            addManualEntry();
                          }
                        }}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setShowManualEntry(false);
                            setManualName('');
                            setManualCalories('');
                          }}
                          className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addManualEntry}
                          disabled={!manualCalories || parseInt(manualCalories) <= 0}
                          className="flex-1 py-2 rounded-xl text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Food Log Entries */}
              <AnimatePresence mode="popLayout">
              {foodLog.map((entry) => {
                const isExpanded = expandedEntries.has(entry.id);
                const hasIngredients = entry.ingredients && entry.ingredients.length > 0;

                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, x: -40, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 40, scale: 0.98 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25
                      }}
                      className="bg-white rounded-2xl overflow-hidden hover:bg-gray-50 transition-colors"
                    >
                      {/* Main entry row */}
                      <div
                        className={`flex items-center gap-3 p-4 ${hasIngredients ? 'cursor-pointer' : ''}`}
                        onClick={() => hasIngredients && toggleExpanded(entry.id)}
                      >
                        <div className="flex-1 flex flex-col items-start">
                          <p className="text-base font-semibold text-gray-900">{entry.name}</p>
                          <p className="text-sm text-orange-500 font-medium">
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
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Empty state - only show when no entries and not adding */}
          {foodLog.length === 0 && !showManualEntry && (
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
          <div className="px-6 pt-4 pb-20 flex-1">
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
              <p className="text-sm text-gray-500 mt-1">Manage your plan</p>
            </div>

            {/* Body & Goals Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-3 uppercase">
                  Body & Goals
                </h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  {/* Current Weight - Clickable */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer">
                    <span className="text-sm text-gray-600">Current weight</span>
                    <span className="font-medium text-gray-900">{currentWeight} kg</span>
                  </div>

                  {/* Goal Weight */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Goal weight</span>
                    <span className="font-medium text-gray-900">{goalWeight} kg</span>
                  </div>

                  {/* Starting Weight */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Starting weight</span>
                    <span className="font-medium text-gray-900">{startingWeight} kg</span>
                  </div>
                </div>
              </div>

              {/* Nutrition Plan Section */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-3 uppercase">
                  Nutrition Plan
                </h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  {/* Daily Calories */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Daily target</span>
                    <span className="font-medium text-gray-900">{totalTarget + surplus} kcal</span>
                  </div>

                  {/* Surplus */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Surplus</span>
                    <span className="font-medium text-gray-900">+{surplus} kcal</span>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-3 uppercase">
                  Progress Snapshot
                </h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  {/* Total Change */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total change</span>
                    <span className={`font-medium ${weightGained >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {weightGained >= 0 ? '+' : ''}{weightGained.toFixed(1)} kg
                    </span>
                  </div>

                  {/* Progress Percentage */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Goal progress</span>
                    <span className="font-medium text-gray-900">{Math.round(calculatedWeightProgress)}%</span>
                  </div>

                  {/* Last Updated */}
                  {lastWeightUpdate && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Last updated</span>
                      <span className="text-xs text-gray-600">
                        {lastWeightUpdate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Section */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-3 uppercase">
                  Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-orange-500">🔥</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{streak}</p>
                    <p className="text-xs text-gray-500 mt-1">Day streak</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-400">📊</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{weightHistory.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Weigh-ins</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {/* Update Weight Button */}
                <button
                  onClick={() => setShowWeightModal(true)}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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

                {/* Logout Button */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-3 bg-gray-50 hover:bg-red-50 text-red-600 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-200"
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
            {/* Streak Hero Section - Minimal & Compact */}
            <div className="mb-6">
              <div className="bg-white rounded-3xl p-4 text-center shadow-sm">
                {/* Flame + Number Row */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex items-center justify-center gap-3 mb-1"
                >
                  {/* Flame with pulsing glow */}
                  <motion.div
                    className="relative"
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full blur-2xl"
                      style={{
                        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.4), rgba(249, 115, 22, 0))',
                        width: '140%',
                        height: '140%',
                        left: '-20%',
                        top: '-20%',
                      }}
                      animate={{
                        opacity: [0.6, 1, 0.6],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                    <span className="relative text-6xl block">🔥</span>
                  </motion.div>

                  {/* Streak Number */}
                  <motion.span
                    key={calculatedStreak}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="text-7xl font-black text-gray-900 tracking-tighter leading-none"
                  >
                    {calculatedStreak}
                  </motion.span>
                </motion.div>

                {/* Streak Label */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-sm text-gray-500 font-medium"
                >
                  {calculatedStreak === 1 ? 'Day Streak' : 'Days Streak'}
                </motion.p>
              </div>
            </div>

            {/* Calendar with Navigation */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                  aria-label="Previous month"
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
                </button>

                <div className="text-center flex-1">
                  <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  {currentMonth.toDateString() !== new Date().toDateString() && (
                    <button
                      onClick={goToToday}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium mt-1"
                    >
                      Today
                    </button>
                  )}
                </div>

                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                  aria-label="Next month"
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {/* Day headers */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={index} className="text-center text-xs font-bold text-gray-400 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {Array.from({ length: 42 }, (_, index) => {
                  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                  const startCalendar = new Date(firstDay);
                  startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());

                  const day = new Date(startCalendar);
                  day.setDate(day.getDate() + index);

                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isCompleted = completedDates.includes(day.toDateString());

                  return (
                    <motion.button
                      key={index}
                      whileHover={{ scale: isCurrentMonth ? 1.05 : 1 }}
                      whileTap={{ scale: isCurrentMonth ? 0.95 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className={`
                        aspect-square flex items-center justify-center text-sm font-semibold rounded-full relative
                        transition-all duration-200 cursor-pointer
                        ${!isCurrentMonth
                          ? 'text-gray-300 cursor-default'
                          : isCompleted
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                            : isToday
                            ? 'border-2 border-orange-500 text-gray-900 font-bold'
                            : 'text-gray-400 hover:text-gray-600'
                        }
                      `}
                    >
                      {day.getDate()}

                      {/* Completion animation */}
                      {isCompleted && isCurrentMonth && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute inset-0 bg-orange-500 rounded-full"
                          style={{ zIndex: -1 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-8 text-xs text-gray-500 border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 ring-2 ring-orange-500 rounded-full" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full" />
                  <span>Missed</span>
                </div>
              </div>
            </div>

            {/* This Week Progress */}
            <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest mb-4 uppercase">
                This Week
              </h3>

              {/* Weekly progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedDates.slice(0, 7).length / 7) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-orange-600">
                  {completedDates.slice(0, 7).length}/7
                </span>
              </div>
            </div>

            {/* Streak Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-white rounded-2xl p-5 text-center shadow-sm"
              >
                <p className="text-3xl font-black text-orange-500">{calculatedStreak}</p>
                <p className="text-xs text-gray-500 mt-2 font-medium">Best streak</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-white rounded-2xl p-5 text-center shadow-sm"
              >
                <p className="text-3xl font-black text-gray-900">
                  {completedDates.length}
                </p>
                <p className="text-xs text-gray-500 mt-2 font-medium">Total completed</p>
              </motion.div>
            </div>

            {/* DEV ONLY: Mock Start Date Controller */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-3 bg-purple-50 border-2 border-purple-200 rounded-xl">
                <p className="text-[10px] font-bold text-purple-800 mb-3">
                  🧪 DEV: Mock Start Date (temp - will be removed)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      resetMockUserStartDate();
                      window.location.reload();
                    }}
                    className="flex-1 py-2 bg-purple-200 hover:bg-purple-300 text-purple-900 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Reset to 3mo ago
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem('mockUserStartDate');
                      window.location.reload();
                    }}
                    className="flex-1 py-2 bg-red-200 hover:bg-red-300 text-red-900 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Clear mock
                  </button>
                </div>
                <p className="text-[9px] text-purple-700 mt-2">
                  Current: {new Date(localStorage.getItem('mockUserStartDate') || '').toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom padding for floating menu */}
        <div className="h-8" />

        {/* Background Overlay (rendered FIRST, stays behind everything) */}
        <AnimatePresence>
          {showFloatingMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
              onClick={() => setShowFloatingMenu(false)}
            />
          )}
        </AnimatePresence>

        {/* Floating Expandable Menu (FAB Style) - Rendered AFTER overlay, stays above */}
        <div className="fixed bottom-4 right-4 z-50">

          {/* Menu Items Container */}
          <AnimatePresence>
            {showFloatingMenu && (
              <motion.div
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
              >
                {[
                  { id: 'dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                  { id: 'streaks', label: 'Streaks', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { id: 'nutrition', label: 'Food', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                  { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                ].map((tab, index) => (
                  <motion.button
                    key={tab.id}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowFloatingMenu(false);
                    }}
                    className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow whitespace-nowrap"
                  >
                    <svg
                      className={`w-5 h-5 ${activeTab === tab.id ? 'text-orange-500' : 'text-gray-600'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={tab.icon}
                      />
                    </svg>
                    <span className={`text-sm font-semibold ${activeTab === tab.id ? 'text-orange-500' : 'text-gray-700'}`}>
                      {tab.label}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* FAB Button */}
          <motion.button
            onClick={() => setShowFloatingMenu(!showFloatingMenu)}
            className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              animate={{ rotate: showFloatingMenu ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-bold"
            >
              ⋯
            </motion.span>
          </motion.button>
        </div>

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
        </div>
        </>
        )}
      </div>
    </motion.div>
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
