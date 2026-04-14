import { supabase } from './supabase.js'

/* ==============================
   AUTH HELPER
============================== */
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/* ==============================
   USER PROFILE
============================== */
export const getUserProfile = async () => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const { data, error } = await supabase
      .from('users_data')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    // Auto-create profile if it doesn't exist
    if (!data) {
      const { data: newProfile, error: createError } = await supabase
        .from('users_data')
        .insert({
          user_id: user.id,
          name: 'User',
          target_calories: 2000
        })
        .select()
        .single()

      if (createError) throw createError
      return newProfile
    }

    return data
  } catch (error) {
    console.error('Error fetching user profile:', error.message)
    throw error
  }
}

export const upsertUserProfile = async (profile) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const { data, error } = await supabase
      .from('users_data')
      .upsert({
        user_id: user.id,
        ...profile
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error upserting user profile:', error.message)
    throw error
  }
}


/* ==============================
   FOOD LOGS
============================== */
export const getFoodLogsByDate = async (date) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_date', date)
      .order('logged_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching food logs for date:', error.message)
    throw error
  }
}

export const addFoodLog = async ({ name, calories_per_unit, quantity = 1, emoji, ingredients }) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const total_calories = calories_per_unit * quantity

    const { data, error } = await supabase
      .from('food_logs')
      .insert({
        user_id: user.id,
        food_name: name,
        calories_per_unit,
        quantity,
        total_calories,
        logged_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding food log:', error.message)
    throw error
  }
}

export const updateFoodLog = async (id, { quantity, calories_per_unit }) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const total_calories = calories_per_unit * quantity

    const { data, error } = await supabase
      .from('food_logs')
      .update({
        quantity,
        total_calories
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating food log:', error.message)
    throw error
  }
}

export const deleteFoodLog = async (id) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting food log:', error.message)
    throw error
  }
}

export const clearFoodLog = async (date) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('logged_date', date)

    if (error) throw error
  } catch (error) {
    console.error('Error clearing food logs for date:', error.message)
    throw error
  }
}

/* ==============================
   WEIGHT HISTORY
============================== */
export const getWeightHistory = async () => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const { data, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_date', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching weight history:', error.message)
    throw error
  }
}

export const addWeightEntry = async (weight, unit = 'kg') => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const { data, error } = await supabase
      .from('weight_history')
      .upsert({
        user_id: user.id,
        weight,
        weight_unit: unit,
        recorded_date: new Date().toISOString().split('T')[0]
      }, {
        onConflict: 'user_id,recorded_date'
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding weight entry:', error.message)
    throw error
  }
}

export const getLatestWeight = async () => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const { data, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching latest weight:', error.message)
    throw error
  }
}

/* ==============================
   STREAK SYSTEM
============================== */
export const getStreak = async () => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching streak:', error.message)
    throw error
  }
}

export const updateStreak = async (calories, target) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    const isHit = calories >= target * 0.8

    const { data: streak, error: fetchError } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) throw fetchError

    const current = isHit ? (streak?.current_streak || 0) + 1 : 0

    const { data, error: updateError } = await supabase
      .from('user_streaks')
      .upsert({
        user_id: user.id,
        current_streak: current,
        best_streak: Math.max(current, streak?.best_streak || 0),
        last_updated: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (updateError) throw updateError
    return data
  } catch (error) {
    console.error('Error updating streak:', error.message)
    throw error
  }
}

/* ==============================
   TEST CONNECTION
============================== */
export async function testConnection() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.warn('Test failed: User not authenticated')
      return { success: false, error: 'User not authenticated' }
    }

    // Test by fetching user's own profile (respects RLS)
    const { data, error } = await supabase
      .from('users_data')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Connection test failed:', error.message)
      return { success: false, error: error.message }
    }

    console.log('Connection test passed. User profile data:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Connection test error:', error.message)
    return { success: false, error: error.message }
  }
}