// Local Storage Data Layer
// Clean implementation for offline-first data management

const STORAGE_KEYS = {
  USER_PROFILE: 'bulkine_user_profile',
  FOOD_LOGS: 'bulkine_food_logs',
  WEIGHT_HISTORY: 'bulkine_weight_history',
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
      kcal: kcal, // Keep both for compatibility
      emoji: emoji || '🍽️',
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
