'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { WeeklyPlanOutput } from '@/lib/diet-engine';
import { searchFoods, type FoodItem, type Ingredient } from '@/lib/food-database';
import { useAuthProtection } from '@/lib/use-auth-protection';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { SmallLoadingState } from '@/components/SmallLoadingState';
import {
  getCurrentUser,
  migrateOldLocalStorage,
  cleanupOldFoodLogs,
  getUserData,
  setUserData,
  updateUserDataField,
} from '@/lib/local-data';
import {
  getUserProfile,
  getFoodLogsByDate,
  addFoodLog,
  deleteFoodLog,
  updateFoodLog,
  getWeightHistory,
  addWeightEntry,
  getStreak,
  updateStreak,
  signOut,
} from '@/lib/supabase-data';

interface FoodLogEntry {
  id: string;
  name: string;
  caloriesPerUnit: number;
  emoji: string;
  timestamp: number;
  quantity?: number;
  ingredients?: Ingredient[];
}

interface StreakData {
  id?: string;
  user_id?: string;
  current_streak: number;
  best_streak: number;
  last_updated: string | null;
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

  // Protect route: redirect if not authenticated or has no profile
  const { isLoading: isAuthLoading } = useAuthProtection({ requireProfile: true });

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
  const [foodError, setFoodError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [prevStreak, setPrevStreak] = useState(0);
  const [viewMode, setViewMode] = useState<'daily' | 'overall'>('daily');
  const [tempMessage, setTempMessage] = useState<{ text: string; emoji: string } | null>(null);
  const [showCelebration, setShowCelebration] = useState<{ level: number; message: string } | null>(null);
  const [mascotMessage, setMascotMessage] = useState<MascotMessage | null>(null);
  const [shownDailyMessageToday, setShownDailyMessageToday] = useState(false);

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
  const [isRetrying, setIsRetrying] = useState(false);
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
    { id: 1, title: 'Complete 80% of Calorie Goal', completed: false, xpReward: 20, type: 'daily', progress: 0 },
    { id: 2, title: 'Log 3 Meals', completed: false, xpReward: 20, type: 'daily', progress: 0 },
    { id: 3, title: 'Hit Your Calorie Goal', completed: false, xpReward: 20, type: 'daily', progress: 0 },
  ]);
  const [weeklyMissions, setWeeklyMissions] = useState([
    { id: 4, title: 'Maintain Your Streak', completed: false, xpReward: 80, type: 'weekly', progress: 0 },
    { id: 5, title: 'Log Meals 5 Days', completed: false, xpReward: 80, type: 'weekly', progress: 0 },
    { id: 6, title: 'Hit Goal 3 Times', completed: false, xpReward: 80, type: 'weekly', progress: 0 },
  ]);
  const [showMissionsTab, setShowMissionsTab] = useState(false);
  const [achievements, setAchievements] = useState([
    { id: 1, name: 'First Steps', description: 'Log your first meal', unlocked: true, icon: '👣' },
    { id: 2, name: 'Week Warrior', description: 'Maintain a 7-day streak', unlocked: true, icon: '⚔️' },
    { id: 3, name: 'Calorie Master', description: 'Hit goal 10 times', unlocked: false, icon: '🎯' },
    { id: 4, name: 'Level 5', description: 'Reach level 5', unlocked: false, icon: '⭐' },
  ]);
  const [totalMealsLogged] = useState(47);
  const [daysActive] = useState(18);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);

  // Avatar evolution data - 5 levels with PNG images
  const avatarEvolution = [
    { level: 1, name: 'Beginner', description: 'Just starting your journey', image: '/levels/Level_1.png' },
    { level: 2, name: 'Consistent', description: 'Growing stronger each day', image: '/levels/Level_2.png' },
    { level: 3, name: 'Strong', description: 'Building solid foundation', image: '/levels/Level_3.png' },
    { level: 4, name: 'Athlete', description: 'Serious about fitness', image: '/levels/Level_4.png' },
    { level: 5, name: 'Legend', description: 'The ultimate fitness legend', image: '/levels/Level_5.png' },
  ];

  const getCurrentAvatar = () => avatarEvolution[Math.min(userLevel - 1, 4)];

  // Handle level up
  useEffect(() => {
    if (userXP >= xpForNextLevel && userLevel < 5) {
      setShowLevelUpAnimation(true);
      setUserLevel(prev => prev + 1);
      setUserXP(0);
      setTimeout(() => setShowLevelUpAnimation(false), 1500);
    }
  }, [userXP, xpForNextLevel, userLevel]);

  // Load centralized user data on mount
  useEffect(() => {
    try {
      const userData = getUserData() as {
        name?: string;
        email?: string;
        height?: number;
        activityLevel?: string;
      };
      if (userData) {
        if (userData.name) setUsername(userData.name);
        if (userData.email) setEmail(userData.email);
        if (userData.height) setProfileHeight(userData.height);
        if (userData.activityLevel) setActivityLevel(userData.activityLevel);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

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

  // Load user data from Supabase on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Migrate old localStorage format if needed
        await migrateOldLocalStorage();

        // Clean up old food logs (keep only today's)
        await cleanupOldFoodLogs();

        // Get current user
        const user = await getCurrentUser();
        console.log('[Dashboard] Current user:', user ? { id: user.id, email: user.email } : 'null');

        if (!user) {
          console.warn('[Dashboard] No authenticated user');
          setLoading(false);
          return;
        }

        // Load plan from localStorage (generated client-side)
        const storedPlan = localStorage.getItem('userPlan');
        const storedOnboarding = localStorage.getItem('onboardingData');
        const userPlan = storedPlan ? JSON.parse(storedPlan) : null;
        const onboardingData = storedOnboarding ? JSON.parse(storedOnboarding) : null;

        // Use Promise.all to fetch user profile, food logs, and weight history in parallel
        const today = new Date().toISOString().split('T')[0];
        const [profile, foodLogs, weightData] = await Promise.all([
          getUserProfile().catch(err => {
            console.error('[Dashboard] Error loading profile:', err);
            return null;
          }),
          getFoodLogsByDate(today).catch(err => {
            console.error('[Dashboard] Error loading food logs:', err);
            return [];
          }),
          getWeightHistory().catch(err => {
            console.error('[Dashboard] Error loading weight history:', err);
            return [];
          })
        ]);

        console.log('[Dashboard] Profile from DB:', profile);
        console.log('[Dashboard] Today\'s food logs:', foodLogs?.length || 0, 'entries');
        console.log('[Dashboard] Weight history:', weightData?.length || 0, 'entries');

        // **CRITICAL: Check if user has completed onboarding**
        // User needs onboarding if profile doesn't have target_calories set
        // (Supabase is source of truth for onboarding completion)
        const hasCompletedOnboarding = !!(profile && profile.target_calories);

        if (!hasCompletedOnboarding) {
          console.warn('[Dashboard] User has not completed onboarding, redirecting...');
          setLoading(false);
          router.replace('/onboarding');
          return;
        }

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
        setStartingWeight(profile?.weight || onboardingData?.currentWeight || 0);
        setGoalWeight(onboardingData?.goalWeight || (profile?.weight ? profile.weight + 10 : 70));
        // Streak will be loaded separately from user_streaks table via getStreak()
        setStreak(1);

        // Convert Supabase food logs to local format
        const formattedLogs = (foodLogs || []).map((log: { id: string; food_name: string; kcal: number; calories_per_unit?: number; emoji: string | null; logged_at: string; quantity?: number; ingredients: Ingredient[] | null }) => ({
          id: log.id,
          name: log.food_name,
          caloriesPerUnit: log.calories_per_unit || log.kcal || 100,
          emoji: log.emoji || '🍽️',
          timestamp: new Date(log.logged_at).getTime(),
          quantity: log.quantity || 1,
          ingredients: log.ingredients || []
        }));

        setFoodLog(formattedLogs);

        // Convert weight history
        const formattedWeightHistory = (weightData || []).map((entry: { weight: number | string; recorded_date: string }) => ({
          weight: parseFloat(entry.weight.toString()),
          date: entry.recorded_date
        }));
        setWeightHistory(formattedWeightHistory);

        // Show welcome message for new day (only once per component mount)
        if (!shownDailyMessageToday) {
          setTempMessage({
            text: "New day. Let's grow",
            emoji: '💪',
          });
          setTimeout(() => setTempMessage(null), 2000);
          setShownDailyMessageToday(true);
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

  // Set up midnight reset timer
  useEffect(() => {
    const setupMidnightReset = () => {
      // Calculate time until midnight
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Set to next midnight
      const timeUntilMidnight = midnight.getTime() - now.getTime();

      // Schedule cleanup at midnight
      const midnightTimer = setTimeout(async () => {
        console.log('[Dashboard] Midnight reset triggered - cleaning up old food logs');
        await cleanupOldFoodLogs();

        // Reload food logs for new day
        const today = new Date().toISOString().split('T')[0];
        const todaysFoodLogs = await getFoodLogsByDate(today);
        const formattedLogs = todaysFoodLogs.map((log: any) => ({
          id: log.id,
          name: log.food_name || log.name,
          caloriesPerUnit: log.calories_per_unit || log.kcal || log.calories || 100,
          emoji: log.emoji || '🍽️',
          timestamp: new Date(log.logged_at || log.timestamp).getTime(),
          quantity: log.quantity || 1,
          ingredients: log.ingredients || []
        }));
        setFoodLog(formattedLogs);

        // Show new day message
        setTempMessage({
          text: "New day. Let's grow",
          emoji: '💪',
        });
        setTimeout(() => setTempMessage(null), 2000);

        // Reschedule for next midnight
        setupMidnightReset();
      }, timeUntilMidnight);

      return midnightTimer;
    };

    const timerId = setupMidnightReset();

    // Cleanup timer on unmount
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // Handle streak updates when food is logged
  useEffect(() => {
    const handleStreakUpdate = async () => {
      if (foodLog.length === 0 || !plan) return;

      const targetCalories = plan.targetCalories || 0;
      if (targetCalories === 0) return;

      try {
        // Calculate today's total calories
        const todayCalories = foodLog.reduce((sum, entry) => sum + (entry.caloriesPerUnit * (entry.quantity || 1)), 0);

        // Update streak via Supabase
        const updatedStreakData = (await updateStreak(todayCalories, targetCalories)) as StreakData;

        if (updatedStreakData) {
          // Update UI with new streak values
          const prevStreak = streak;
          setStreak(updatedStreakData.current_streak);
          setPrevStreak(prevStreak);

          // Show mascot reaction if streak increased
          if (updatedStreakData.current_streak > prevStreak) {
            const currentProgress = targetCalories > 0 ? Math.min((todayCalories / targetCalories) * 100, 100) : 0;
            const streakMessage = getStreakMessage(currentProgress);
            setMascotMessage({ text: streakMessage });

            const messageTimer = setTimeout(() => setMascotMessage(null), 2500);
            return () => clearTimeout(messageTimer);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Error updating streak:', error);
      }
    };

    handleStreakUpdate();
  }, [foodLog.length, plan]); // Trigger when food log or plan changes

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

  const caloriesConsumed = foodLog.reduce((sum, entry) => sum + (entry.caloriesPerUnit * (entry.quantity || 1)), 0);
  const progress = totalTarget > 0 ? Math.min((caloriesConsumed / totalTarget) * 100, 100) : 0;

  // Auto-complete missions based on progress and persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server

    // Calculate current progress metrics
    const mealCount = foodLog.length;
    const streakValue = streak || 0;
    const goalProgress = progress;

    // Update daily missions
    const updatedDaily = dailyMissions.map(mission => {
      let missionProgress = 0;
      let shouldComplete = false;

      if (mission.id === 1) {
        // 80% calorie goal
        missionProgress = Math.min(goalProgress / 80, 1);
        shouldComplete = goalProgress >= 80;
      } else if (mission.id === 2) {
        // Log 3 meals
        missionProgress = Math.min(mealCount / 3, 1);
        shouldComplete = mealCount >= 3;
      } else if (mission.id === 3) {
        // Hit calorie goal (100%)
        missionProgress = Math.min(goalProgress / 100, 1);
        shouldComplete = goalProgress >= 100;
      }

      if (!mission.completed && shouldComplete) {
        // Auto-complete and award XP
        setUserXP(prev => prev + mission.xpReward);
        return { ...mission, completed: true, progress: 1 };
      }

      return { ...mission, progress: missionProgress };
    });

    // Check for daily bonus (all 3 completed)
    const allDailyComplete = updatedDaily.every(m => m.completed);
    const previousAllDailyComplete = dailyMissions.every(m => m.completed);
    if (allDailyComplete && !previousAllDailyComplete) {
      // Give bonus for completing all daily missions
      setUserXP(prev => prev + 40);
    }

    setDailyMissions(updatedDaily);

    // Update weekly missions
    const updatedWeekly = weeklyMissions.map(mission => {
      let missionProgress = 0;
      let shouldComplete = false;

      if (mission.id === 4) {
        // Maintain streak
        missionProgress = Math.min(streakValue / Math.max(streakValue, 7), 1);
        shouldComplete = streakValue > 0;
      } else if (mission.id === 5) {
        // Log meals 5 days (using daysActive as proxy)
        missionProgress = Math.min(daysActive / 5, 1);
        shouldComplete = daysActive >= 5;
      } else if (mission.id === 6) {
        // Hit goal multiple times (we'll use a simplified metric)
        missionProgress = Math.min(Math.floor(goalProgress / 100) / 3, 1);
        shouldComplete = Math.floor(goalProgress / 100) >= 3;
      }

      if (!mission.completed && shouldComplete) {
        setUserXP(prev => prev + mission.xpReward);
        return { ...mission, completed: true, progress: 1 };
      }

      return { ...mission, progress: missionProgress };
    });

    setWeeklyMissions(updatedWeekly);

    // Persist to localStorage
    localStorage.setItem('dailyMissions', JSON.stringify(updatedDaily));
    localStorage.setItem('weeklyMissions', JSON.stringify(updatedWeekly));
  }, [foodLog.length, streak, progress, daysActive]);

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
        // Get streak data from Supabase
        const streakData = (await getStreak()) as StreakData | null;

        if (streakData) {
          // Update UI with streak values from Supabase
          setCalculatedStreak(streakData.current_streak);
          setStreak(streakData.current_streak);

          // Note: Supabase only tracks current/best streaks, not individual dates
          // To show completed dates on calendar, you would need to:
          // 1. Query historical food logs and calculate which days hit 80%+ target
          // 2. Or add a streakDates field to the user_streaks table in Supabase
          // For now, calendar will show empty completed dates
          setCompletedDates([]);
        }
      } catch (error) {
        console.error('[Dashboard] Error calculating streak history:', error);
      }
    };

    calculateStreakHistory();
  }, [totalTarget, userProfile?.id, foodLog]); // Recalculate when user profile, target, or food logs change

  // Initialize calendar month on mount
  useEffect(() => {
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
  }, [caloriesConsumed, plan]);

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
    // Ensure calories is valid (fallback to 100 if missing/0)
    const caloriesPerUnit = food.kcal || 100;

    const entry: FoodLogEntry = {
      id: `${food.id}-${Date.now()}`,
      name: food.name,
      caloriesPerUnit,
      emoji: food.emoji,
      timestamp: Date.now(),
      quantity: 1,
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
        calories_per_unit: caloriesPerUnit,
        quantity: 1,
        emoji: food.emoji,
        ingredients: food.ingredients
      });

      // Replace optimistic update with real entry from database
      setFoodLog((prev) => [
        {
          id: savedEntry.id,
          name: savedEntry.food_name,
          caloriesPerUnit: savedEntry.calories_per_unit || savedEntry.calories || 100,
          emoji: savedEntry.emoji || '🍽️',
          timestamp: new Date(savedEntry.logged_at).getTime(),
          quantity: savedEntry.quantity || 1,
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
      setFoodError(errorMessage);
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
      caloriesPerUnit: kcal || 100,
      emoji: '🍽️',
      timestamp: Date.now(),
      quantity: 1,
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
        calories_per_unit: entry.caloriesPerUnit,
        quantity: 1,
        emoji: entry.emoji,
        ingredients: []
      });

      // Replace optimistic update with real entry from database
      setFoodLog((prev) => [
        {
          id: savedEntry.id,
          name: savedEntry.food_name,
          caloriesPerUnit: savedEntry.calories_per_unit || savedEntry.calories || 100,
          emoji: savedEntry.emoji || '🍽️',
          timestamp: new Date(savedEntry.logged_at).getTime(),
          quantity: savedEntry.quantity || 1,
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
      setFoodError(errorMessage);
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

  // Update food quantity
  const updateQuantity = async (id: string, delta: number) => {
    const entry = foodLog.find(item => item.id === id);
    if (!entry) return;

    const newQuantity = Math.max(0, (entry.quantity || 1) + delta);

    // Remove item if quantity becomes 0
    if (newQuantity === 0) {
      await removeFood(id);
      return;
    }

    const originalEntry = { ...entry };

    try {
      setSaving(true);

      // Optimistic update
      setFoodLog((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );

      // Update in database
      await updateFoodLog(id, {
        quantity: newQuantity,
        calories_per_unit: entry.caloriesPerUnit
      });

      // Refresh user profile to get updated calories
      const updatedProfile = await getUserProfile();
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }

    } catch (error) {
      console.error('Error updating food quantity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update food quantity';
      setError(errorMessage);
      // Revert optimistic update
      setFoodLog((prev) =>
        prev.map((item) =>
          item.id === id ? originalEntry : item
        )
      );
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
  const handleRedesignPlan = () => {
    console.log('Redesign plan clicked');
    try {
      // Clear plan and onboarding data
      localStorage.removeItem('userPlan');
      localStorage.removeItem('onboardingData');
      console.log('Cleared localStorage, navigating to onboarding');

      // Close modal and navigate
      setShowRedesignConfirm(false);
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

      // Sign out from Supabase
      await signOut();

      // Clear localStorage
      localStorage.removeItem('userPlan');
      localStorage.removeItem('onboardingData');

      // Close modal and redirect to home
      setShowLogoutConfirm(false);
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      setError('Failed to log out. Please try again.');
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
      updateUserDataField('height', value);
      hasChanged = true;
    } else if (field === 'goalWeight' && value !== goalWeight) {
      setGoalWeight(value);
      updateUserDataField('goalWeight', value);
      hasChanged = true;
    } else if (field === 'activity' && editValue !== activityLevel) {
      setActivityLevel(editValue);
      updateUserDataField('activityLevel', editValue);
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
    <>
      {isAuthLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Verifying your account...</p>
          </div>
        </div>
      ) : (
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
            <ErrorDisplay
              title="Failed to load dashboard"
              message={error}
              onRetry={() => {
                setIsRetrying(true);
                setError(null);
                window.location.reload();
              }}
              isRetrying={isRetrying}
              icon="⚠️"
            />
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
          ) : activeTab === 'progress' ? (
            /* Progress Page Header */
            <div className="w-full">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Progress
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

            {/* Outer container - simple flex layout */}
            <div className="flex justify-center">
              {/* Mascot wrapper - RELATIVE context for bubble positioning */}
              <div className="relative inline-block">
                {/* Mascot thought bubble - premium iOS-style interaction */}
                <AnimatePresence mode="wait">
                  {mascotMessage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7, y: 16 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        transition: {
                          type: 'spring',
                          stiffness: 260,
                          damping: 18,
                          mass: 1,
                        },
                      }}
                      exit={{ opacity: 0, scale: 0.7, y: 16 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 18,
                      }}
                      className="absolute bottom-full mb-[-20px] left-1/2 -translate-x-1/2 z-10"
                    >
                      {/* Floating animation container */}
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.5,
                          ease: 'easeInOut',
                        }}
                        className="bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] text-center text-sm leading-snug max-w-[240px] border border-gray-100"
                      >
                        <p className="font-semibold text-gray-800 break-words">
                          {mascotMessage.text}
                        </p>
                        {/* Premium tail - elegant pointer below bubble */}
                        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white/90 rotate-45 shadow-sm" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mascot image container */}
                <div className="relative w-52 h-52">
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

                {/* End mascot image container */}
                </div>

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
              {/* End mascot wrapper */}
            </div>
            {/* End outer container */}
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
                        className={`flex items-center justify-between gap-3 p-4 ${hasIngredients ? 'cursor-pointer' : ''}`}
                        onClick={() => hasIngredients && toggleExpanded(entry.id)}
                      >
                        {/* Left: Food name and calories */}
                        <div className="flex-1 flex flex-col items-start min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-base font-semibold text-gray-900 truncate">{entry.name}</p>
                            {(entry.quantity || 1) > 1 && (
                              <span className="text-gray-400 text-sm flex-shrink-0">
                                x{entry.quantity || 1}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-orange-500 font-medium">
                            {((entry.caloriesPerUnit || 0) * (entry.quantity || 1))} kcal
                          </p>
                        </div>

                        {/* Right: Controls */}
                        <div className="flex items-center gap-2 ml-auto">
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

                          {/* Decrement button - removes item if quantity = 1 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if ((entry.quantity || 1) === 1) {
                                removeFood(entry.id);
                              } else {
                                updateQuantity(entry.id, -1);
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            title={(entry.quantity || 1) === 1 ? "Remove item" : "Decrease quantity"}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          </button>

                          {/* Increment button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(entry.id, 1);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            title="Increase quantity"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
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
                        updateUserDataField('name', editValue);
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setUsername(editValue);
                          updateUserDataField('name', editValue);
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
                        updateUserDataField('email', editValue);
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEmail(editValue);
                          updateUserDataField('email', editValue);
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

          </div>
        )}

        {/* Progress Tab Content */}
        {activeTab === 'progress' && (
          <div className="w-full bg-gray-50 min-h-screen pt-12 pb-20">
            {/* Avatar Section - Pure vertical flow */}
            <div className="flex flex-col items-center px-4 mb-6 -mt-2">
              {/* Avatar Image */}
              <div className="mb-4" style={{ width: '320px', height: '320px' }}>
                <Image
                  src={getCurrentAvatar().image}
                  alt={getCurrentAvatar().name}
                  width={320}
                  height={320}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>

              {/* Level Name */}
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {getCurrentAvatar().name}
              </h2>

              {/* Level Info */}
              <p className="text-sm text-gray-600 mb-6">
                Level {userLevel} of 5
              </p>

              {/* XP Text */}
              <p className="text-xs font-medium text-gray-600 mb-2">
                {userXP} / {xpForNextLevel} XP
              </p>

              {/* XP Progress Bar */}
              <div className="w-full max-w-sm h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  key={`xp-${userLevel}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(userXP / xpForNextLevel) * 100}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                />
              </div>
            </div>

            {/* Level Cards - Pyramid Layout */}
            <div className="flex flex-col items-center mt-6">
              {/* First Row - 3 Avatars */}
              <div className="flex justify-center gap-6">
                {avatarEvolution.slice(0, 3).map((avatar) => (
                  <div
                    key={avatar.level}
                    className="flex flex-col items-center"
                  >
                    {/* Avatar Card */}
                    <div
                      className={`relative w-20 h-20 rounded-full mb-2 flex items-center justify-center transition-all ${
                        userLevel >= avatar.level
                          ? userLevel === avatar.level
                            ? 'bg-white shadow-md ring-2 ring-orange-500 scale-105'
                            : 'bg-white shadow-sm'
                          : 'bg-gray-100'
                      }`}
                    >
                      <div className={`relative w-16 h-16 ${userLevel >= avatar.level ? 'opacity-100' : 'opacity-40'}`}>
                        <Image
                          src={avatar.image}
                          alt={`Level ${avatar.level}`}
                          width={64}
                          height={64}
                          className="object-contain w-full h-full"
                        />
                      </div>

                      {/* Lock Icon */}
                      {userLevel < avatar.level && (
                        <div className="absolute inset-0 rounded-full bg-black/5 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Level Label */}
                    <span className={`text-xs font-semibold ${userLevel >= avatar.level ? 'text-gray-900' : 'text-gray-400'}`}>
                      Lv {avatar.level}
                    </span>
                  </div>
                ))}
              </div>

              {/* Second Row - 2 Avatars */}
              <div className="flex justify-center gap-6 mt-4">
                {avatarEvolution.slice(3, 5).map((avatar) => (
                  <div
                    key={avatar.level}
                    className="flex flex-col items-center"
                  >
                    {/* Avatar Card */}
                    <div
                      className={`relative w-20 h-20 rounded-full mb-2 flex items-center justify-center transition-all ${
                        userLevel >= avatar.level
                          ? userLevel === avatar.level
                            ? 'bg-white shadow-md ring-2 ring-orange-500 scale-105'
                            : 'bg-white shadow-sm'
                          : 'bg-gray-100'
                      }`}
                    >
                      <div className={`relative w-16 h-16 ${userLevel >= avatar.level ? 'opacity-100' : 'opacity-40'}`}>
                        <Image
                          src={avatar.image}
                          alt={`Level ${avatar.level}`}
                          width={64}
                          height={64}
                          className="object-contain w-full h-full"
                        />
                      </div>

                      {/* Lock Icon */}
                      {userLevel < avatar.level && (
                        <div className="absolute inset-0 rounded-full bg-black/5 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Level Label */}
                    <span className={`text-xs font-semibold ${userLevel >= avatar.level ? 'text-gray-900' : 'text-gray-400'}`}>
                      Lv {avatar.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missions Section */}
            <div className="mt-8 w-full px-4">
              {/* Missions Heading */}
              <h2 className="text-2xl font-bold text-gray-900 px-4 mb-4">
                Missions
              </h2>

              {/* Toggle Buttons */}
              <div className="flex gap-2 mb-6 justify-center">
                <button
                  onClick={() => setShowMissionsTab(false)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${
                    !showMissionsTab
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setShowMissionsTab(true)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${
                    showMissionsTab
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Weekly
                </button>
              </div>

              {/* Mission Cards */}
              <div className="space-y-3">
                {(showMissionsTab ? weeklyMissions : dailyMissions).map(mission => (
                  <motion.div
                    key={mission.id}
                    className="bg-white rounded-2xl p-4 transition-all"
                    animate={mission.completed ? { scale: 0.98, opacity: 0.7 } : {}}
                  >
                    {/* Mission Header - Title and XP */}
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-medium text-sm ${
                        mission.completed
                          ? 'text-gray-400 line-through'
                          : 'text-gray-800'
                      }`}>
                        {mission.title}
                      </span>
                      <span className={`font-semibold text-sm ${
                        mission.completed
                          ? 'text-orange-500 opacity-70'
                          : 'text-orange-500'
                      }`}>
                        +{mission.xpReward}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${mission.completed ? 100 : Math.min((mission.progress || 0) * 100, 100)}%` }}
                        className="h-full bg-orange-500 rounded-full"
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Daily Bonus Info */}
              {!showMissionsTab && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-orange-900">
                    Complete all daily missions for <span className="font-bold">+40 XP</span> bonus!
                  </p>
                </div>
              )}
            </div>

            {/* Level Up Animation */}
            <AnimatePresence>
              {showLevelUpAnimation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 z-50 flex items-center justify-center"
                >
                  <div className="text-center bg-white rounded-3xl px-8 py-6 shadow-lg">
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
                      You are now a {getCurrentAvatar().name}
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
              className="fixed inset-0 z-50 bg-black/10 backdrop-blur-sm"
              onClick={() => setShowFloatingMenu(false)}
            />
          )}
        </AnimatePresence>

        {/* Floating Expandable Menu (FAB Style) - Rendered AFTER overlay, stays above */}
        <div className="fixed bottom-4 right-4 z-[51]">

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
      )}
    </>
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
