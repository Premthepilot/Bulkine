// Local Storage Data Layer
// Clean implementation for offline-first data management

const STORAGE_KEYS = {
  USER_PROFILE: 'bulkine_user_profile',
  FOOD_LOGS: 'bulkine_food_logs',
  WEIGHT_HISTORY: 'bulkine_weight_history',
  USER_DATA: 'bulkine_user_data', // Centralized user onboarding data
};

// Helper to safely access localStorage
const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

// Generate unique ID
const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ===== USER PROFILE OPERATIONS =====

export const getCurrentUser = async () => {
  // For local storage, we simulate a user
  return { id: 'local_user', email: 'local@user.com' };
};

export const getUserProfile = async () => {
  try {
    const storage = getStorage();
    if (!storage) return null;

    const data = storage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const upsertUserProfile = async (profileData) => {
  try {
    const storage = getStorage();
    if (!storage) throw new Error('Storage not available');

    const existing = await getUserProfile();
    const updated = {
      ...existing,
      ...profileData,
      user_id: 'local_user',
      updated_at: new Date().toISOString(),
    };

    storage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    console.log('[upsertUserProfile] Success!', updated);
    return updated;
  } catch (error) {
    console.error('[upsertUserProfile] Error:', error);
    throw error;
  }
};

// ===== FOOD LOG OPERATIONS =====

const getAllFoodLogs = () => {
  const storage = getStorage();
  if (!storage) return [];

  const data = storage.getItem(STORAGE_KEYS.FOOD_LOGS);
  return data ? JSON.parse(data) : [];
};

const saveFoodLogs = (logs) => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(STORAGE_KEYS.FOOD_LOGS, JSON.stringify(logs));
};

// Clean up old food logs (keep only today's logs, remove from previous days)
export const cleanupOldFoodLogs = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logs = getAllFoodLogs();
    const filtered = logs.filter((log) => {
      const logDate = log.logged_at?.split('T')[0] || log.date;
      return logDate === today;
    });

    if (filtered.length !== logs.length) {
      saveFoodLogs(filtered);
      console.log('[cleanupOldFoodLogs] Removed', logs.length - filtered.length, 'old logs');
    }

    return filtered;
  } catch (error) {
    console.error('[cleanupOldFoodLogs] Error:', error);
    return [];
  }
};

export const getFoodLogsByDate = async (date) => {
  try {
    const logs = getAllFoodLogs();
    const filtered = logs.filter((log) => {
      const logDate = log.logged_at?.split('T')[0] || log.date;
      return logDate === date;
    });
    return filtered;
  } catch (error) {
    console.error('Error getting food logs:', error);
    return [];
  }
};

export const addFoodLog = async ({ name, kcal, emoji, ingredients }) => {
  try {
    const logs = getAllFoodLogs();
    const now = new Date().toISOString();

    const newLog = {
      id: generateId(),
      user_id: 'local_user',
      food_name: name,
      name: name, // Keep both for compatibility
      calories: kcal,
      caloriesPerUnit: kcal, // Base calories per unit
      kcal: kcal, // Keep for compatibility
      emoji: emoji || '🍽️',
      quantity: 1,
      ingredients: ingredients || [],
      logged_at: now,
      date: now.split('T')[0],
      created_at: now,
    };

    logs.push(newLog);
    saveFoodLogs(logs);

    console.log('[addFoodLog] Added:', newLog);
    return newLog;
  } catch (error) {
    console.error('[addFoodLog] Error:', error);
    throw error;
  }
};

export const deleteFoodLog = async (foodLogId) => {
  try {
    const logs = getAllFoodLogs();
    const filtered = logs.filter((log) => log.id !== foodLogId);

    if (logs.length === filtered.length) {
      console.warn('[deleteFoodLog] Log not found:', foodLogId);
    }

    saveFoodLogs(filtered);
    console.log('[deleteFoodLog] Deleted:', foodLogId);
    return true;
  } catch (error) {
    console.error('[deleteFoodLog] Error:', error);
    throw error;
  }
};

// ===== WEIGHT HISTORY OPERATIONS =====

const getAllWeightHistory = () => {
  const storage = getStorage();
  if (!storage) return [];

  const data = storage.getItem(STORAGE_KEYS.WEIGHT_HISTORY);
  return data ? JSON.parse(data) : [];
};

const saveWeightHistory = (history) => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(STORAGE_KEYS.WEIGHT_HISTORY, JSON.stringify(history));
};

export const getWeightHistory = async () => {
  try {
    const history = getAllWeightHistory();
    // Sort by date descending
    return history.sort(
      (a, b) => new Date(b.recorded_date) - new Date(a.recorded_date)
    );
  } catch (error) {
    console.error('Error getting weight history:', error);
    return [];
  }
};

export const addWeightEntry = async (weight, date = null) => {
  try {
    const history = getAllWeightHistory();
    const recordedDate = date || new Date().toISOString().split('T')[0];

    // Check if entry exists for this date, update if so
    const existingIndex = history.findIndex(
      (entry) => entry.recorded_date === recordedDate
    );

    const entry = {
      id: generateId(),
      user_id: 'local_user',
      weight: parseFloat(weight),
      recorded_date: recordedDate,
      created_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      history[existingIndex] = { ...history[existingIndex], weight: entry.weight };
    } else {
      history.push(entry);
    }

    saveWeightHistory(history);
    console.log('[addWeightEntry] Added:', entry);
    return entry;
  } catch (error) {
    console.error('Error adding weight entry:', error);
    throw error;
  }
};

// ===== STREAK OPERATIONS =====

export const updateDailyCalories = async (date = null) => {
  try {
    const logDate = date || new Date().toISOString().split('T')[0];
    const todaysFoodLogs = await getFoodLogsByDate(logDate);
    const totalCalories = todaysFoodLogs.reduce(
      (sum, log) => sum + (log.kcal || log.calories || 0),
      0
    );

    console.log('[updateDailyCalories] Total for', logDate, ':', totalCalories);

    // Update profile with current calories
    const profile = await getUserProfile();
    if (profile) {
      await upsertUserProfile({ ...profile, calories: totalCalories });
    }

    return totalCalories;
  } catch (error) {
    console.error('[updateDailyCalories] Error:', error);
    return 0;
  }
};

// ===== COMPLETE STREAK SYSTEM =====

const STORAGE_KEYS_STREAK = {
  STREAK_DATA: 'bulkine_streak_data',
};

/**
 * Get or initialize streak data structure
 * @returns {Object} Streak data: { streakDates: [], currentStreak: 0, bestStreak: 0, lastUpdated: null }
 */
const getStreakData = () => {
  const storage = getStorage();
  if (!storage) return { streakDates: [], currentStreak: 0, bestStreak: 0, lastUpdated: null };

  try {
    const data = storage.getItem(STORAGE_KEYS_STREAK.STREAK_DATA);
    return data ? JSON.parse(data) : { streakDates: [], currentStreak: 0, bestStreak: 0, lastUpdated: null };
  } catch {
    return { streakDates: [], currentStreak: 0, bestStreak: 0, lastUpdated: null };
  }
};

/**
 * Save streak data to localStorage
 * @param {Object} streakData - Streak data object
 */
const saveStreakData = (streakData) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEYS_STREAK.STREAK_DATA, JSON.stringify(streakData));
};

/**
 * Check if today is already in streak dates (prevent duplicates)
 * @returns {boolean}
 */
const isTodayInStreakDates = () => {
  const today = new Date().toISOString().split('T')[0];
  const streakData = getStreakData();
  return streakData.streakDates.includes(today);
};

/**
 * Calculate current streak from consecutive dates (backward from today)
 * @param {string[]} streakDates - Array of ISO date strings (YYYY-MM-DD)
 * @returns {number} Number of consecutive days from today
 */
const calculateCurrentStreak = (streakDates) => {
  if (!streakDates || streakDates.length === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    if (streakDates.includes(dateStr)) {
      streak++;
    } else {
      break; // Stop at first gap
    }
  }

  return streak;
};

/**
 * Calculate best streak from all dates
 * @param {string[]} streakDates - Array of ISO date strings
 * @returns {number} Longest streak ever achieved
 */
const calculateBestStreak = (streakDates) => {
  if (!streakDates || streakDates.length === 0) return 0;

  // Sort dates in ascending order
  const sorted = [...streakDates].sort();
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1]);
    const currDate = new Date(sorted[i]);

    // Check if dates are consecutive (differ by 1 day)
    const dayDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
};

/**
 * Check if a day is completed (80% of target calories)
 * @param {number} caloriesConsumed
 * @param {number} targetCalories
 * @returns {boolean}
 */
export const isStreakCompleted = (caloriesConsumed, targetCalories) => {
  if (targetCalories <= 0) return false;
  return caloriesConsumed >= targetCalories * 0.8;
};

/**
 * Update streak based on today's calorie intake
 * Call this after food is logged or at midnight
 * @param {number} caloriesConsumed - Total calories for today
 * @param {number} targetCalories - Target calories
 * @returns {Promise<{streakDates: string[], currentStreak: number, bestStreak: number, lastUpdated: string | null}>} Updated streak data
 */
export const updateStreakForDay = async (caloriesConsumed, targetCalories) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const streakData = getStreakData();

    // Check if today is already in streak dates (prevent duplicates)
    if (!streakData.streakDates.includes(today)) {
      // Check if streak is completed for today
      if (isStreakCompleted(caloriesConsumed, targetCalories)) {
        // Add today to streak dates
        streakData.streakDates.push(today);

        // Recalculate current and best streaks
        streakData.currentStreak = calculateCurrentStreak(streakData.streakDates);
        streakData.bestStreak = calculateBestStreak(streakData.streakDates);
        streakData.lastUpdated = new Date().toISOString();

        saveStreakData(streakData);
        console.log('[updateStreakForDay] Streak updated:', streakData);
      }
    }

    return streakData;
  } catch (error) {
    console.error('[updateStreakForDay] Error:', error);
    return getStreakData();
  }
};

/**
 * Get current streak data
 * @returns {Object}
 */
export const getStreakStatus = () => {
  return getStreakData();
};

/**
 * Get streak dates for a specific month (ISO format YYYY-MM-DD)
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January, 11 = December)
 * @returns {string[]} Array of ISO dates in that month
 */
export const getStreakDatesForMonth = (year, month) => {
  const streakData = getStreakData();
  const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
  const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

  return streakData.streakDates.filter(date => date >= monthStart && date <= monthEnd);
};

/**
 * Reset streak (for admin/dev purposes)
 */
export const resetStreakData = () => {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEYS_STREAK.STREAK_DATA);
  console.log('[resetStreakData] Streak data cleared');
};

/**
 * Legacy compatibility: Update streak in user profile
 * (Kept for backward compatibility - new system uses separate storage)
 */
export const updateStreak = async (newStreak) => {
  try {
    const profile = await getUserProfile();
    const updated = await upsertUserProfile({
      ...profile,
      streak: newStreak,
    });
    return updated;
  } catch (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
};

// ===== UTILITY FUNCTIONS =====

export const syncUserData = async () => {
  try {
    const profile = await getUserProfile();
    const today = new Date().toISOString().split('T')[0];
    const todaysFoodLogs = await getFoodLogsByDate(today);
    const weightHistory = await getWeightHistory();

    return {
      profile,
      todaysFoodLogs,
      weightHistory,
    };
  } catch (error) {
    console.error('Error syncing user data:', error);
    return null;
  }
};

export const clearAllData = () => {
  const storage = getStorage();
  if (!storage) return;

  Object.values(STORAGE_KEYS).forEach((key) => {
    storage.removeItem(key);
  });

  console.log('All local data cleared');
};

// Migration helper - import data from old localStorage format
export const migrateOldLocalStorage = async () => {
  try {
    const storage = getStorage();
    if (!storage) return;

    // Migrate old userData/onboardingData to new profile format
    const oldUserData = JSON.parse(storage.getItem('userData') || '{}');
    const oldOnboarding = JSON.parse(storage.getItem('onboardingData') || '{}');
    const oldStreak = parseInt(storage.getItem('dailyStreak') || '1');

    if (Object.keys(oldUserData).length > 0 || Object.keys(oldOnboarding).length > 0) {
      await upsertUserProfile({
        weight: oldUserData.weight || oldOnboarding.weight,
        height: oldUserData.height || oldOnboarding.height,
        age: oldUserData.age || oldOnboarding.age,
        gender: oldUserData.gender || oldOnboarding.gender,
        activityLevel: oldUserData.activityLevel || oldOnboarding.activityLevel,
        goal: oldUserData.goal || oldOnboarding.goal,
        targetCalories: oldUserData.targetCalories || oldOnboarding.targetCalories,
        streak: oldStreak,
      });
    }

    // Migrate old weight history
    const oldWeightHistory = JSON.parse(storage.getItem('weightHistory') || '[]');
    for (const entry of oldWeightHistory) {
      await addWeightEntry(entry.weight, entry.date);
    }

    // Migrate old food logs
    const keys = Object.keys(storage);
    const foodLogKeys = keys.filter((key) => key.startsWith('foodLog_'));

    for (const key of foodLogKeys) {
      const date = key.replace('foodLog_', '');
      const foodLog = JSON.parse(storage.getItem(key) || '[]');

      for (const entry of foodLog) {
        // Check if already migrated
        const existing = await getFoodLogsByDate(date);
        const alreadyExists = existing.some(
          (e) => e.name === entry.name && e.kcal === entry.kcal
        );

        if (!alreadyExists) {
          const newEntry = {
            id: generateId(),
            user_id: 'local_user',
            food_name: entry.name,
            name: entry.name,
            calories: entry.kcal,
            kcal: entry.kcal,
            emoji: entry.emoji || '🍽️',
            ingredients: entry.ingredients || [],
            logged_at: `${date}T12:00:00.000Z`,
            date: date,
            created_at: new Date().toISOString(),
          };

          const logs = getAllFoodLogs();
          logs.push(newEntry);
          saveFoodLogs(logs);
        }
      }
    }

    console.log('Migration from old localStorage completed');
    return true;
  } catch (error) {
    console.error('Error migrating old localStorage:', error);
    return false;
  }
};

// ===== CENTRALIZED USER DATA SYSTEM =====
// Unified storage for onboarding and profile data

/**
 * Default user data structure
 */
const DEFAULT_USER_DATA = {
  name: '',
  email: '',
  bodyType: '',
  mainGoal: '',
  workoutFrequency: '',
  height: 170,
  heightUnit: 'cm',
  currentWeight: 70,
  weightUnit: 'kg',
  goalWeight: 70,
  targetCalories: 2000,
  activityLevel: 'moderate',
  createdAt: null,
  updatedAt: null,
};

/**
 * Get all centralized user data
 * @returns {Object} User data object
 */
export const getUserData = () => {
  const storage = getStorage();
  if (!storage) return DEFAULT_USER_DATA;

  try {
    const data = storage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : DEFAULT_USER_DATA;
  } catch (error) {
    console.error('Error getting user data:', error);
    return DEFAULT_USER_DATA;
  }
};

/**
 * Set/update centralized user data
 * @param {Object} userData - Updated user data (merges with existing)
 * @returns {Object} Updated user data
 */
export const setUserData = (userData) => {
  const storage = getStorage();
  if (!storage) return;

  try {
    const existing = getUserData();
    const updated = {
      ...existing,
      ...userData,
      updatedAt: new Date().toISOString(),
    };

    storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updated));
    console.log('[setUserData] Updated:', updated);
    return updated;
  } catch (error) {
    console.error('Error setting user data:', error);
    throw error;
  }
};

/**
 * Update a single user data field
 * @param {string} field - Field name
 * @param {any} value - New value
 * @returns {Object} Updated user data
 */
export const updateUserDataField = (field, value) => {
  return setUserData({ [field]: value });
};

/**
 * Clear all user data (reset to defaults)
 */
export const clearUserData = () => {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(STORAGE_KEYS.USER_DATA);
  console.log('[clearUserData] User data cleared');
};
