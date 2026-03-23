import { supabase, verifySession } from './supabase.js';

// Helper function to get current user with session verification
export const getCurrentUser = async () => {
  try {
    console.log('[getCurrentUser] Verifying session...');

    // Use verifySession to ensure we have a valid session
    const { session, user, error } = await verifySession();

    if (error) {
      console.error('[getCurrentUser] Session verification failed:', error);
      return null;
    }

    if (!user) {
      console.error('[getCurrentUser] No authenticated user');
      return null;
    }

    console.log('[getCurrentUser] Authenticated user:', {
      id: user.id,
      email: user.email
    });

    return user;
  } catch (error) {
    console.error('[getCurrentUser] Error:', error.message || error);
    return null;
  }
};

// ===== USER PROFILE OPERATIONS =====
// Note: users_data table only has columns: user_id, weight, calories, streak

export const getUserProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users_data')
      .select('*')
      .eq('user_id', user.id)
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
    // First verify we have an active session
    const { session, user, error: sessionError } = await verifySession();

    if (sessionError || !session || !user) {
      console.error('[upsertUserProfile] Session verification failed:', sessionError || 'No session/user');
      throw new Error('User not authenticated - please log in again');
    }

    console.log('[upsertUserProfile] Verified user:', {
      id: user.id,
      email: user.email
    });

    // Only use columns that exist in users_data table: user_id, weight, calories, streak
    const payload = {
      user_id: user.id,
      weight: profileData.weight || null,
      calories: profileData.calories || null,
      streak: profileData.streak || 1
    };

    console.log('[upsertUserProfile] Payload:', JSON.stringify(payload, null, 2));

    const { data, error } = await supabase
      .from('users_data')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    console.log('[upsertUserProfile] Response - data:', data, 'error:', error);

    if (error) {
      console.error('[upsertUserProfile] Supabase error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('[upsertUserProfile] Success!');
    return data;
  } catch (error) {
    console.error('[upsertUserProfile] Error:', error.message || error);
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

export const addFoodLog = async ({ name, kcal, emoji, ingredients }) => {
  // ✅ Get logged-in user
  const { data, error: userError } = await supabase.auth.getUser();

  const user = data?.user;

  console.log("User:", user);

  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // ✅ Insert into DB
  const { data: insertData, error } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,        // 🔥 REQUIRED
      food_name: name,         // 🔥 MUST MATCH COLUMN
      calories: kcal,          // 🔥 FIXED (NOT kcal)
      emoji: emoji || "🍽️"
    })
    .select()
    .single();

  console.log("Insert result:", insertData);
  console.log("Insert error:", error);

  if (error) {
    throw error;
  }

  return insertData;
};

export const deleteFoodLog = async (foodLogId) => {
  try {
    const user = await getCurrentUser();

    console.log('[deleteFoodLog] User:', user ? { id: user.id } : 'null');
    console.log('[deleteFoodLog] Deleting food log:', foodLogId);

    if (!user) {
      console.error('[deleteFoodLog] User not authenticated');
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', foodLogId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[deleteFoodLog] Supabase error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('[deleteFoodLog] Success! Entry deleted');

    // Update total calories after deletion
    await updateDailyCalories();

    return true;
  } catch (error) {
    console.error('[deleteFoodLog] Error:', error.message || error);
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

export const updateDailyCalories = async (date = null) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const logDate = date || new Date().toISOString().split('T')[0];

    // Get today's food logs and calculate total calories
    const todaysFoodLogs = await getFoodLogsByDate(logDate);
    const totalCalories = todaysFoodLogs.reduce((sum, log) => sum + (log.kcal || 0), 0);

    console.log('[updateDailyCalories] Total calories for', logDate, ':', totalCalories);

    // Update the calories in users_data table
    const { data, error } = await supabase
      .from('users_data')
      .update({ calories: totalCalories })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[updateDailyCalories] Error updating calories:', error.message);
      // Don't throw - this is not critical
    } else {
      console.log('[updateDailyCalories] Successfully updated calories in DB');
    }

    return totalCalories;
  } catch (error) {
    console.error('[updateDailyCalories] Error:', error.message || error);
    // Don't throw - this is not critical for food logging
    return 0;
  }
};

export const updateStreak = async (newStreak) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('users_data')
      .update({ streak: newStreak })
      .eq('user_id', user.id)
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
    const dailyStreak = parseInt(localStorage.getItem('dailyStreak') || '1');

    // Migrate user profile data - only use columns that exist: user_id, weight, calories, streak
    if (Object.keys(userData).length > 0 || Object.keys(onboardingData).length > 0) {
      const profileData = {
        weight: userData.weight || onboardingData.weight,
        calories: userPlan.targetCalories || null,
        streak: dailyStreak
      };

      await upsertUserProfile(profileData);
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