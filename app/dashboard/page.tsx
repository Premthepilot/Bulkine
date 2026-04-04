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

// ========== MASCOT BEHAVIOR SYSTEM ==========
type MascotMood = 'tired' | 'waking' | 'eating' | 'focused' | 'excited' | 'flexing';

interface MascotMessage {
  text: string;
}

// Progress-based message system - contextual instead of random
const getProgressMessage = (progress: number): string => {
  if (progress >= 100) {
    // Goal achieved messages
    return progress === 100 ? "That's what I'm talking about!" : "Goal smashed 💪";
  }
  if (progress >= 90) {
    // Final stretch - alternating messages
    return progress === 90 ? "So close. Finish strong." : "One more push.";
  }
  if (progress >= 50) {
    // Halfway+ messages
    return progress >= 70 ? "Almost there — stay consistent." : "Nice progress… don't slow down now.";
  }
  if (progress >= 1) {
    // Early progress messages
    return progress >= 25 ? "We're building momentum." : "Good start — keep it going.";
  }
  // No progress yet
  return "Fuel up, we've got work to do.";
};

// Context-specific messages for food/streak/tap
const getTapMessage = (progress: number): string => {
  if (progress >= 100) return "Let's keep crushing it! 💪";
  if (progress >= 90) return "Push for the finish line! 🏆";
  if (progress >= 50) return "You're in it now! 💪";
  if (progress >= 1) return "Let's fuel up! 🔥";
  return "Let's get started!";
};

const getFoodMessage = (progress: number): string => {
  if (progress >= 90) return "YES! FINISH STRONG! 🔥";
  if (progress >= 50) return "That's the way! Keep it up! ✨";
  if (progress >= 1) return "Every bite counts! 🚀";
  return "First meal matters! Let's go! 🚀";
};

const getStreakMessage = (progress: number): string => {
  if (progress >= 90) return "LEGENDARY consistency! 🔥";
  if (progress >= 50) return "Days stacking up! Stay strong! 🏆";
  if (progress >= 1) return "Building the habit! 💪";
  return "Starting the grind! 🔥";
};
// ========== END MASCOT BEHAVIOR SYSTEM ==========

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

// Custom hook for profile header scroll-linked animation
// Smoother, shorter range (80px) for premium feel
function useScrollLinkedProfileHeader() {
  const [profileHeaderStyle, setProfileHeaderStyle] = useState<{ transform: string; opacity: number }>({
    transform: 'translateY(0)',
    opacity: 1,
  });

  useEffect(() => {
    const handleScroll = () => {
      // Clamp scroll value to prevent negative values from scroll bounce
      const scrollY = Math.max(window.scrollY, 0);

      // Calculate progress (0 to 1) over 80px scroll distance
      // At scrollY=0: progress=0 (header fully visible)
      // At scrollY=80: progress=1 (header fully hidden)
      const progress = Math.min(scrollY / 80, 1);

      // Apply continuous transform and opacity based on scroll
      const translateY = -progress * 100;
      const opacity = 1 - progress;

      setProfileHeaderStyle({
        transform: `translateY(${translateY}%)`,
        opacity: Math.max(opacity, 0),
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return profileHeaderStyle;
}

function DashboardPageClient() {
  const router = useRouter();
  const [plan, setPlan] = useState<WeeklyPlanOutput | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Scroll-linked header animation
  const headerStyle = useScrollLinkedHeader();

  // Scroll-linked profile header animation (premium smooth fade/slide)
  const profileHeaderStyle = useScrollLinkedProfileHeader();

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
  const [mascotMessage, setMascotMessage] = useState<MascotMessage | null>(null);

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

  // Profile state
  const [username, setUsername] = useState('User');
  const [email, setEmail] = useState('user@example.com');
  const [showRedesignConfirm, setShowRedesignConfirm] = useState(false);

  // Smart profile state
  const [profileHeight, setProfileHeight] = useState(180);
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [caloriesMessage, setCaloriesMessage] = useState<string | null>(null);
  const prevCaloriesTargetRef = useRef<number>(0);

  // Floating menu state
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  // Progress/Gamification state
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(245);
  const [xpForNextLevel] = useState(500);
  const [dailyMissions, setDailyMissions] = useState([
    { id: 1, title: 'Log 3 meals', completed: false },
    { id: 2, title: 'Reach calorie goal', completed: false },
    { id: 3, title: 'Stay active', completed: false },
  ]);
  const [achievements, setAchievements] = useState([
    { id: 1, name: 'First Steps', description: 'Log your first meal', unlocked: true, icon: '👣' },
    { id: 2, name: 'Week Warrior', description: 'Maintain a 7-day streak', unlocked: true, icon: '⚔️' },
    { id: 3, name: 'Calorie Master', description: 'Hit goal 10 times', unlocked: false, icon: '🎯' },
    { id: 4, name: 'Level 5', description: 'Reach level 5', unlocked: false, icon: '⭐' },
  ]);
  const [totalMealsLogged] = useState(47);
  const [daysActive] = useState(18);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);

  // Avatar evolution data
  const avatarEvolution = [
    { level: 1, name: '🌱 Seedling', description: 'Just starting your journey', emoji: '🌱', color: 'from-green-200 to-green-300' },
    { level: 2, name: '🌿 Sprout', description: 'Growing stronger each day', emoji: '🌿', color: 'from-green-300 to-green-400' },
    { level: 3, name: '🌳 Sapling', description: 'Building solid foundation', emoji: '🌳', color: 'from-green-400 to-green-500' },
    { level: 4, name: '💪 Muscle', description: 'Strength is building', emoji: '💪', color: 'from-red-400 to-red-500' },
    { level: 5, name: '🏋️ Athlete', description: 'Serious about fitness', emoji: '🏋️', color: 'from-orange-400 to-orange-500' },
    { level: 6, name: '🥇 Champion', description: 'A true champion', emoji: '🥇', color: 'from-yellow-400 to-yellow-500' },
    { level: 7, name: '👑 Royalty', description: 'Ruling the fitness realm', emoji: '👑', color: 'from-purple-400 to-purple-500' },
    { level: 8, name: '🔥 Inferno', description: 'On fire, unstoppable', emoji: '🔥', color: 'from-red-500 to-orange-600' },
    { level: 9, name: '⭐ Superstar', description: 'A shining example', emoji: '⭐', color: 'from-blue-400 to-blue-500' },
    { level: 10, name: '🌟 Legend', description: 'The ultimate fitness legend', emoji: '🌟', color: 'from-amber-300 to-amber-500' },
  ];

  const getCurrentAvatar = () => avatarEvolution[Math.min(userLevel - 1, 9)];

  // Handle level up
  useEffect(() => {
    if (userXP >= xpForNextLevel && userLevel < 10) {
      setShowLevelUpAnimation(true);
      setUserLevel(prev => prev + 1);
      setUserXP(0);
      setTimeout(() => setShowLevelUpAnimation(false), 1500);
    }
  }, [userXP, xpForNextLevel, userLevel]);

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

  // Mascot tap handler - show contextual message
  const handleMascotTap = () => {
    const currentProgress = viewMode === 'overall' ? weightProgress : progress;
    const messageText = getTapMessage(currentProgress);
    setMascotMessage({ text: messageText });

    // Trigger small bounce animation on mascot
    mascotControls.start({
      scale: [1, 1.05, 1],
      transition: { duration: 0.3, ease: 'easeOut' },
    });

    // Auto-dismiss after 2.5 seconds
    const timer = setTimeout(() => setMascotMessage(null), 2500);
    return () => clearTimeout(timer);
  };

  // Show greeting message on mount
  useEffect(() => {
    const greetingText = "Let's make today count! 💪";
    setMascotMessage({ text: greetingText });

    const timer = setTimeout(() => setMascotMessage(null), 3000);
    return () => clearTimeout(timer);
  }, []); // Only on mount

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

          // Show mascot reaction to streak increase - use current daily progress
          const currentProgress = progress;
          const streakMessage = getStreakMessage(currentProgress);
          setMascotMessage({ text: streakMessage });

          const messageTimer = setTimeout(() => setMascotMessage(null), 2500);
          return () => clearTimeout(messageTimer);
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
          size: 'w-64 h-64',
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
          size: 'w-60 h-60',
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
          size: 'w-56 h-56',
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
        size: 'w-56 h-56',
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
        size: 'w-64 h-64',
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
        size: 'w-60 h-60',
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
      size: 'w-56 h-56',
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

      // Show mascot reaction to food being added - use daily progress for relevance
      const foodMessageText = getFoodMessage(progress);
      setMascotMessage({ text: foodMessageText });

      const messageTimer = setTimeout(() => setMascotMessage(null), 2000);
      return () => clearTimeout(messageTimer);

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

      // Show mascot reaction to food being added - use daily progress for relevance
      const foodMessageText = getFoodMessage(progress);
      setMascotMessage({ text: foodMessageText });

      const messageTimer = setTimeout(() => setMascotMessage(null), 2000);
      return () => clearTimeout(messageTimer);

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

  // Redesign plan handler
  const handleRedesignPlan = async () => {
    try {
      // Clear plan and onboarding data
      localStorage.removeItem('userPlan');
      localStorage.removeItem('onboardingData');

      // Redirect to onboarding
      router.push('/onboarding');
    } catch (error) {
      console.error('Error redesigning plan:', error);
      setShowRedesignConfirm(false);
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

  // Calculate daily calories based on weight and activity level
  const calculateDailyCalories = (weight: number, activity: string): number => {
    const baseCalories = weight * 30;
    const activityMultipliers: { [key: string]: number } = {
      sedentary: 1.0,
      light: 1.1,
      moderate: 1.2,
      active: 1.3,
      veryActive: 1.4,
    };
    const multiplier = activityMultipliers[activity] || 1.2;
    return Math.round(baseCalories * multiplier + 300); // +300 for surplus
  };

  // Get current weight for calculation (use startingWeight as fallback)
  const effectiveWeight = currentWeight || startingWeight || 70;
  const calculatedDailyCalories = calculateDailyCalories(effectiveWeight, activityLevel);

  // Trigger calorie update feedback when calculated calories change
  useEffect(() => {
    if (plan && calculatedDailyCalories !== prevCaloriesTargetRef.current && prevCaloriesTargetRef.current !== 0) {
      // Only show message if value actually changed
      setCaloriesMessage(`Calories updated to ${calculatedDailyCalories} kcal`);
      setTimeout(() => setCaloriesMessage(null), 2000);
    }
    prevCaloriesTargetRef.current = calculatedDailyCalories;
  }, [calculatedDailyCalories, plan]);

  // Handle field editing
  const startEditing = (field: string, value: string | number) => {
    setEditingField(field);
    setEditValue(value.toString());
  };

  const saveFieldEdit = (field: string) => {
    const value = parseFloat(editValue);
    if (isNaN(value) || value <= 0) {
      setEditingField(null);
      return;
    }

    // Only update if value actually changed
    let hasChanged = false;
    if (field === 'height' && value !== profileHeight) {
      setProfileHeight(value);
      hasChanged = true;
    } else if (field === 'goalWeight' && value !== goalWeight) {
      setGoalWeight(value);
      hasChanged = true;
    } else if (field === 'activity' && editValue !== activityLevel) {
      setActivityLevel(editValue);
      hasChanged = true;
    }

    if (hasChanged) {
      // Feedback will be shown by useEffect via calculatedDailyCalories change
      setEditingField(null);
    }
  };

  // Get total weight gained
  const weightGained = currentWeight - startingWeight;

  // Get last updated date
  const lastWeightUpdate = weightHistory.length > 0
    ? new Date(weightHistory[weightHistory.length - 1].date)
    : null;

  const mascotState = getMascotState();

  return (
    <motion.div
      className="min-h-screen bg-gray-100 flex items-center justify-center"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      <div className="w-full max-w-sm min-h-screen bg-[#F8F9FA] flex flex-col overflow-y-auto">
        {/* Top Gradient Overlay - Soft cloudy fade */}
        <div className="fixed top-0 left-0 right-0 h-16 z-30 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

        {/* Bottom Gradient Overlay - Soft cloudy fade */}
        <div className="fixed bottom-0 left-0 right-0 h-20 z-30 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />

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
            transform: activeTab === 'profile' ? profileHeaderStyle.transform : headerStyle.transform,
            opacity: activeTab === 'profile' ? profileHeaderStyle.opacity : headerStyle.opacity,
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'none', // No transition - animation is tied to scroll
          }}
        >
          {activeTab === 'profile' ? (
            /* Profile Page Header - Simple contextual header */
            <div className="w-full">
              <h1 className="text-lg font-semibold text-gray-900">
                Profile
              </h1>
            </div>
          ) : activeTab === 'streaks' ? (
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
        <div className="px-6 pt-6 pb-6 mt-8 flex flex-col items-center">
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
                    {/* Breathing animation - subtle idle motion */}
                    <motion.div
                      animate={{
                        scale: [1, 1.04, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="w-full h-full"
                    >
                      {/* Only image is clickable - inline-block for precise touch area */}
                      <button
                        onClick={handleMascotTap}
                        className="inline-block cursor-pointer hover:opacity-80 transition-opacity w-full h-full focus:outline-none"
                        type="button"
                        aria-label="Interact with mascot"
                      >
                        <Image
                          src={mascotState.image}
                          alt="Capybara mascot"
                          fill
                          className="object-contain"
                          priority
                        />
                      </button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {/* Mascot thought bubble message - smooth cloud-like animation */}
              <AnimatePresence>
                {mascotMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{
                      opacity: 1,
                      scale: [1.05, 1],
                      y: -45,
                    }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{
                      duration: 0.3,
                      ease: 'easeOut',
                      scale: {
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                        mass: 1,
                      }
                    }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 z-30 bg-white rounded-3xl px-5 py-3 shadow-lg border border-gray-50 max-w-[240px]"
                  >
                    <p className="text-sm font-semibold text-gray-800 text-center leading-snug">
                      {mascotMessage.text}
                    </p>
                    {/* Cloud tail - elegant pointer below bubble */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-gray-50 transform rotate-45 shadow-sm" />
                  </motion.div>
                )}
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
          <div className="flex-1 flex flex-col bg-gray-100 pt-16">
            {/* Header Section - Centered Avatar + Name + Email */}
            <div className="bg-gray-100 px-6 py-8">
              <div className="flex flex-col items-center">
                {/* Avatar Circle */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold mb-3">
                  {username.charAt(0).toUpperCase()}
                </div>

                {/* Username */}
                <h2 className="text-lg font-bold text-gray-900 text-center">
                  {username}
                </h2>

                {/* Email */}
                <p className="text-sm text-gray-500 text-center mt-1">
                  {email}
                </p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-gray-100">

            {/* Personal Information Section */}
            <div>
              <div className="px-4 mb-2 mt-6">
                <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Personal Information
                </h3>
              </div>

              {/* List Items - White Card */}
              <div className="mx-4 bg-white rounded-3xl overflow-hidden">
                {/* Username Row - Editable inline */}
                <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-600">Username</label>
                  </div>
                  {editingField === 'username' ? (
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        setUsername(editValue);
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setUsername(editValue);
                          setEditingField(null);
                        }
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                      className="text-right text-gray-900 bg-transparent focus:outline-none text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => startEditing('username', username)}
                      className="text-right text-gray-900 text-sm flex items-center gap-2 hover:text-orange-500 transition-colors"
                    >
                      {username}
                      <span className="text-gray-400 text-lg">›</span>
                    </button>
                  )}
                </div>

                {/* Email Row */}
                <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-600">Email</label>
                  </div>
                  {editingField === 'email' ? (
                    <input
                      autoFocus
                      type="email"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        setEmail(editValue);
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEmail(editValue);
                          setEditingField(null);
                        }
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                      className="text-right text-gray-900 bg-transparent focus:outline-none text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => startEditing('email', email)}
                      className="text-right text-gray-900 text-sm flex items-center gap-2 hover:text-orange-500 transition-colors"
                    >
                      {email}
                      <span className="text-gray-400 text-lg">›</span>
                    </button>
                  )}
                </div>

                {/* Height Row */}
                <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600">Height</label>
                  {editingField === 'height' ? (
                    <input
                      autoFocus
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveFieldEdit('height')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveFieldEdit('height');
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                      className="text-right text-gray-900 bg-transparent focus:outline-none text-sm"
                      placeholder="cm"
                    />
                  ) : (
                    <button
                      onClick={() => startEditing('height', profileHeight)}
                      className="text-gray-900 text-sm flex items-center gap-2 hover:text-orange-500 transition-colors"
                    >
                      {profileHeight} cm
                      <span className="text-gray-400 text-lg">›</span>
                    </button>
                  )}
                </div>

                {/* Current Weight Row - Links to modal */}
                <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600">Current weight</label>
                  <button
                    onClick={() => setShowWeightModal(true)}
                    className="text-gray-900 text-sm flex items-center gap-2 hover:text-orange-500 transition-colors"
                  >
                    {currentWeight} kg
                    <span className="text-gray-400 text-lg">›</span>
                  </button>
                </div>

                {/* Goal Weight Row - No bottom border (last item) */}
                <div className="px-4 py-4 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600">Goal weight</label>
                  {editingField === 'goalWeight' ? (
                    <input
                      autoFocus
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveFieldEdit('goalWeight')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveFieldEdit('goalWeight');
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                      className="text-right text-gray-900 bg-transparent focus:outline-none text-sm"
                      placeholder="kg"
                    />
                  ) : (
                    <button
                      onClick={() => startEditing('goalWeight', goalWeight)}
                      className="text-gray-900 text-sm flex items-center gap-2 hover:text-orange-500 transition-colors"
                    >
                      {goalWeight} kg
                      <span className="text-gray-400 text-lg">›</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Nutrition Plan Section */}
            <div>
              <div className="px-4 mb-2 mt-6">
                <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Nutrition Plan
                </h3>
              </div>

              {/* List Items - White Card */}
              <div className="mx-4 bg-white rounded-3xl overflow-hidden">
                {/* Daily Calories Row */}
                <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600">Daily target</label>
                  <motion.span
                    key={calculatedDailyCalories}
                    initial={{ scale: 1.1, color: '#f97316' }}
                    animate={{ scale: 1, color: '#111827' }}
                    transition={{ duration: 0.3 }}
                    className="text-sm font-medium text-gray-900"
                  >
                    {calculatedDailyCalories} kcal
                  </motion.span>
                </div>

                {/* Activity Level Row - No bottom border (last item before feedback) */}
                <div className="px-4 py-4 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600">Activity level</label>
                  <span className="text-sm text-gray-900">
                    {activityLevel === 'sedentary' && 'Sedentary'}
                    {activityLevel === 'light' && 'Light'}
                    {activityLevel === 'moderate' && 'Moderate'}
                    {activityLevel === 'active' && 'Active'}
                    {activityLevel === 'veryActive' && 'Very Active'}
                  </span>
                </div>

                {/* Feedback Message - Shows on change */}
                <AnimatePresence>
                  {caloriesMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 py-3 bg-orange-100 border-t border-orange-200 text-center"
                    >
                      <p className="text-xs font-medium text-orange-700">
                        ✓ {caloriesMessage}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Activity Level Selector Section */}
            <div>
              <div className="px-4 mb-2 mt-6">
                <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Activity Level
                </h3>
              </div>

              {/* Inset Rounded Container */}
              <div className="mx-4 bg-white rounded-3xl overflow-hidden">
                {['sedentary', 'light', 'moderate', 'active', 'veryActive'].map((level, index) => (
                  <button
                    key={level}
                    onClick={() => {
                      if (activityLevel !== level) {
                        setActivityLevel(level);
                      }
                    }}
                    className={`w-full px-4 py-4 flex items-center justify-between transition-colors ${
                      index !== 4 ? 'border-b border-gray-100' : ''
                    } ${
                      activityLevel === level ? 'bg-orange-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-sm font-medium ${activityLevel === level ? 'text-orange-700' : 'text-gray-700'}`}>
                      {level === 'sedentary' && '🛋️ Sedentary'}
                      {level === 'light' && '🚶 Light'}
                      {level === 'moderate' && '🏃 Moderate'}
                      {level === 'active' && '⛹️ Active'}
                      {level === 'veryActive' && '🏋️ Very Active'}
                    </span>
                    {activityLevel === level && (
                      <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Section */}
            <div>
              <div className="px-4 mb-2 mt-6">
                <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Stats
                </h3>
              </div>

              {/* Inset Rounded Container */}
              <div className="mx-4 bg-white rounded-3xl overflow-hidden">
                {/* Streak Row */}
                <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔥</span>
                    <label className="text-sm font-medium text-gray-600">Day streak</label>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{streak}</span>
                </div>

                {/* Weigh-ins Row - No bottom border (last item) */}
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📊</span>
                    <label className="text-sm font-medium text-gray-600">Weigh-ins</label>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{weightHistory.length}</span>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div>
              <div className="px-4 mb-2 mt-6">
                <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Actions
                </h3>
              </div>

              {/* Inset Rounded Container */}
              <div className="mx-4 bg-white rounded-3xl overflow-hidden">
                {/* Redesign Plan */}
                <button
                  onClick={() => setShowRedesignConfirm(true)}
                  className="w-full px-4 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-orange-50 transition-colors"
                >
                  <span className="text-sm font-medium text-orange-600">Redesign plan</span>
                  <span className="text-gray-400 text-lg">›</span>
                </button>

                {/* Logout - No bottom border (last item) */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-red-50 transition-colors"
                >
                  <span className="text-sm font-medium text-red-600">Logout</span>
                  <span className="text-gray-400 text-lg">›</span>
                </button>
              </div>
            </div>

            {/* Bottom Padding */}
            <div className="h-6" />

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

            {/* Redesign Plan Confirmation Modal */}
            <AnimatePresence>
              {showRedesignConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
                  onClick={() => setShowRedesignConfirm(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Redesign your plan?
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                      This will reset your current plan and onboarding progress. You can set up a new plan from scratch.
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowRedesignConfirm(false)}
                        className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRedesignPlan}
                        className="flex-1 py-3 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                      >
                        Continue
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

        {/* Progress Tab Content - Avatar Evolution System */}
        {activeTab === 'progress' && (
          <div className="pt-4 pb-20 flex-1 overflow-y-auto">
            {/* Hero Section - Avatar Display */}
            <motion.div
              key={`avatar-${userLevel}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative px-6 pt-4"
            >
              {/* Level-Up Animation Overlay */}
              <AnimatePresence>
                {showLevelUpAnimation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-10 flex items-center justify-center"
                  >
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="text-6xl mb-3"
                      >
                        ✨
                      </motion.div>
                      <motion.p
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl font-bold text-gray-900 mb-1"
                      >
                        Level Up!
                      </motion.p>
                      <motion.p
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-gray-600"
                      >
                        Evolved to {getCurrentAvatar().name}
                      </motion.p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Avatar Card */}
              <div className={`bg-gradient-to-b ${getCurrentAvatar().color} rounded-3xl p-8 text-center shadow-sm mb-4 relative overflow-hidden`}>
                {/* Background decorative elements */}
                <div className="absolute top-4 right-4 opacity-10 text-6xl">✨</div>

                {/* Large Avatar Display */}
                <motion.div
                  key={`emoji-${userLevel}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'backOut' }}
                  className="text-8xl mb-4"
                >
                  {getCurrentAvatar().emoji}
                </motion.div>

                {/* Level & Name */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-white/80 mb-1">Level {userLevel} of 10</p>
                  <h2 className="text-3xl font-black text-white">{getCurrentAvatar().name}</h2>
                  <p className="text-sm text-white/90 mt-2">{getCurrentAvatar().description}</p>
                </div>

                {/* XP Progress Bar */}
                <div className="mb-2 bg-white/20 rounded-full h-4 overflow-hidden">
                  <motion.div
                    key={`xp-${userLevel}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(userXP / xpForNextLevel) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <p className="text-xs text-white/80">{userXP} / {xpForNextLevel} XP</p>
              </div>
            </motion.div>

            {/* Evolution Timeline */}
            <div className="mt-8 mb-6">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3 px-6">
                Evolution Path
              </h3>
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-2 px-6 pb-2">
                  {avatarEvolution.map((avatar) => (
                    <motion.div
                      key={avatar.level}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: avatar.level * 0.03 }}
                      className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all ${
                        userLevel >= avatar.level
                          ? `bg-gradient-to-b ${avatar.color} shadow-md`
                          : 'bg-gray-100'
                      }`}
                    >
                      <div className={`text-4xl ${userLevel >= avatar.level ? 'opacity-100' : 'opacity-40'}`}>
                        {avatar.emoji}
                      </div>
                      <p className={`text-[10px] font-bold mt-1 ${userLevel >= avatar.level ? 'text-white' : 'text-gray-500'}`}>
                        Lv{avatar.level}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Spacer */}
            <div className="px-6">
              {/* Daily Missions Section */}
              <div className="mt-6">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3 px-0">
                Daily Missions
              </h3>
              <div className="space-y-2">
                {dailyMissions.map((mission, index) => (
                  <motion.button
                    key={mission.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setDailyMissions(prev =>
                        prev.map(m => m.id === mission.id ? { ...m, completed: !m.completed } : m)
                      );
                      if (!mission.completed) {
                        setUserXP(prev => Math.min(prev + 50, xpForNextLevel));
                      }
                    }}
                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow active:scale-95"
                  >
                    <motion.div
                      animate={{ scale: mission.completed ? 1 : 0.9 }}
                      className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${
                        mission.completed
                          ? 'bg-orange-500 border-orange-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {mission.completed && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </motion.div>
                    <span className={`flex-1 text-left font-medium ${
                      mission.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}>
                      {mission.title}
                    </span>
                    <span className="text-xs font-semibold text-orange-500">+50 XP</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Stats Section */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-white rounded-2xl p-4 text-center shadow-sm"
              >
                <p className="text-3xl font-black text-orange-500">{totalMealsLogged}</p>
                <p className="text-xs text-gray-500 mt-2 font-medium">Meals logged</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-white rounded-2xl p-4 text-center shadow-sm"
              >
                <p className="text-3xl font-black text-blue-500">{daysActive}</p>
                <p className="text-xs text-gray-500 mt-2 font-medium">Days active</p>
              </motion.div>
            </div>

            {/* Achievements Section */}
            <div className="mt-6">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">
                Achievements
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-2xl p-4 text-center ${
                      achievement.unlocked
                        ? 'bg-white shadow-sm hover:shadow-md transition-shadow'
                        : 'bg-gray-100 opacity-50'
                    }`}
                  >
                    <p className="text-3xl mb-2">{achievement.icon}</p>
                    <p className="text-sm font-semibold text-gray-900">{achievement.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{achievement.description}</p>
                    {achievement.unlocked && (
                      <p className="text-xs text-orange-500 font-bold mt-2">✓ Unlocked</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Streak Summary */}
            <div className="mt-6 bg-white rounded-2xl p-4 text-center shadow-sm">
              <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">Streaks</p>
              <div className="flex items-center justify-center gap-4">
                <div>
                  <p className="text-3xl font-black text-orange-500">{calculatedStreak}</p>
                  <p className="text-xs text-gray-500 mt-1">Current</p>
                </div>
                <div className="w-px h-12 bg-gray-200" />
                <div>
                  <p className="text-3xl font-black text-gray-900">{calculatedStreak}</p>
                  <p className="text-xs text-gray-500 mt-1">Best</p>
                </div>
              </div>
            </div>
            </div>
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
                  { id: 'progress', label: 'Progress', icon: 'M12 8c-1.657 0-3 .895-3 2v6c0 1.105 1.343 2 3 2s3-.895 3-2v-6c0-1.105-1.343-2-3-2z' },
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
