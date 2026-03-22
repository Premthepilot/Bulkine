import { supabase } from './supabase.js';

// Helper function to get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// ===== USER PROFILE OPERATIONS =====

export const getUserProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const upsertUserProfile = async (profileData) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting user profile:', error);
    throw error;
  }
};

// ===== FOOD LOG OPERATIONS =====

export const getFoodLogsByDate = async (date) => {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_date', date)
      .order('logged_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting food logs:', error);
    return [];
  }
};

export const addFoodLog = async (foodEntry, date = null) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const logDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('food_logs')
      .insert({
        user_id: user.id,
        food_name: foodEntry.name,
        kcal: foodEntry.kcal,
        emoji: foodEntry.emoji,
        ingredients: foodEntry.ingredients || [],
        logged_date: logDate
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding food log:', error);
    throw error;
  }
};

export const deleteFoodLog = async (foodLogId) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', foodLogId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting food log:', error);
    throw error;
  }
};

// ===== WEIGHT HISTORY OPERATIONS =====

export const getWeightHistory = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting weight history:', error);
    return [];
  }
};

export const addWeightEntry = async (weight, date = null) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const recordedDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('weight_history')
      .upsert({
        user_id: user.id,
        weight: parseFloat(weight),
        recorded_date: recordedDate,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding weight entry:', error);
    throw error;
  }
};

// ===== STREAK OPERATIONS =====

export const updateStreak = async (streakData) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        daily_streak: streakData.dailyStreak,
        last_log_date: streakData.lastLogDate,
        last_active_date: streakData.lastActiveDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
};

// ===== DATA MIGRATION HELPERS =====

export const migrateLocalStorageData = async () => {
  try {
    if (typeof window === 'undefined') return;

    // Get existing localStorage data
    const onboardingData = JSON.parse(localStorage.getItem('onboardingData') || '{}');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userPlan = JSON.parse(localStorage.getItem('userPlan') || '{}');
    const weightHistory = JSON.parse(localStorage.getItem('weightHistory') || '[]');
    const dailyStreak = parseInt(localStorage.getItem('dailyStreak') || '0');
    const lastLogDate = localStorage.getItem('lastLogDate');
    const lastActiveDate = localStorage.getItem('lastActiveDate');

    // Migrate user profile data
    if (Object.keys(userData).length > 0 || Object.keys(onboardingData).length > 0) {
      const profileData = {
        body_type: userData.bodyType || onboardingData.bodyType,
        main_goal: userData.mainGoal || onboardingData.mainGoal,
        workout_frequency: userData.workoutFrequency || onboardingData.workoutFrequency,
        height: userData.height || onboardingData.height,
        weight: userData.weight || onboardingData.weight,
        goal_weight: userData.goalWeight || onboardingData.goalWeight,
        commitment: userData.commitment || onboardingData.commitment,
        appetite: userData.appetite,
        meals_per_day: userData.mealsPerDay,
        diet_preference: userData.dietPreference,
        user_plan: Object.keys(userPlan).length > 0 ? userPlan : null,
        daily_streak: dailyStreak,
        last_log_date: lastLogDate,
        last_active_date: lastActiveDate
      };

      // Remove null/undefined values
      const cleanedProfileData = Object.fromEntries(
        Object.entries(profileData).filter(([_, v]) => v != null)
      );

      await upsertUserProfile(cleanedProfileData);
    }

    // Migrate weight history
    if (weightHistory.length > 0) {
      for (const entry of weightHistory) {
        await addWeightEntry(entry.weight, entry.date);
      }
    }

    // Migrate food logs (scan all possible dates in localStorage)
    const keys = Object.keys(localStorage);
    const foodLogKeys = keys.filter(key => key.startsWith('foodLog_'));

    for (const key of foodLogKeys) {
      const date = key.replace('foodLog_', '');
      const foodLog = JSON.parse(localStorage.getItem(key) || '[]');

      for (const entry of foodLog) {
        await addFoodLog({
          name: entry.name,
          kcal: entry.kcal,
          emoji: entry.emoji,
          ingredients: entry.ingredients
        }, date);
      }
    }

    console.log('Data migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error migrating localStorage data:', error);
    throw error;
  }
};

// ===== UTILITY FUNCTIONS =====

export const clearLocalStorageData = () => {
  if (typeof window === 'undefined') return;

  const keysToRemove = [
    'onboardingData',
    'userData',
    'userPlan',
    'weightHistory',
    'dailyStreak',
    'lastLogDate',
    'lastActiveDate'
  ];

  // Remove food log entries
  const keys = Object.keys(localStorage);
  const foodLogKeys = keys.filter(key => key.startsWith('foodLog_'));
  keysToRemove.push(...foodLogKeys);

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  console.log('Local storage data cleared');
};

export const syncUserData = async () => {
  try {
    // This function can be called periodically to ensure data sync
    const user = await getCurrentUser();
    if (!user) return null;

    // Get fresh data from database
    const profile = await getUserProfile();
    const today = new Date().toISOString().split('T')[0];
    const todaysFoodLogs = await getFoodLogsByDate(today);
    const weightHistory = await getWeightHistory();

    return {
      profile,
      todaysFoodLogs,
      weightHistory
    };
  } catch (error) {
    console.error('Error syncing user data:', error);
    return null;
  }
};