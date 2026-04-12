import { supabase } from './supabase.js'

/* ==============================
   AUTH HELPER
============================== */
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

/* ==============================
   USER PROFILE
============================== */
export const getUserProfile = async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users_data')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) return null
  return data
}

export const upsertUserProfile = async (profile) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not logged in')

  const { data, error } = await supabase
    .from('users_data')
    .upsert({
      user_id: user.id,
      ...profile
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/* ==============================
   FOOD LOGS
============================== */
export const getFoodLogsByDate = async (date) => {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('logged_date', date)
    .order('logged_at', { ascending: true })

  if (error) throw error
  return data || []
}

export const addFoodLog = async ({ name, calories_per_unit, quantity = 1, emoji, ingredients }) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const total_calories = calories_per_unit * quantity

  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: user.id,
      food_name: name,
      calories_per_unit,
      quantity,
      total_calories,
      emoji,
      ingredients,
      logged_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteFoodLog = async (id) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
  return true
}

export const clearFoodLog = async (date) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('user_id', user.id)
    .eq('logged_date', date)

  if (error) throw error
}

/* ==============================
   WEIGHT HISTORY
============================== */
export const getWeightHistory = async () => {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('weight_history')
    .select('*')
    .eq('user_id', user.id)
    .order('recorded_date', { ascending: true })

  if (error) throw error
  return data || []
}

export const addWeightEntry = async (weight, unit = 'kg') => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('weight_history')
    .upsert({
      user_id: user.id,
      weight,
      weight_unit: unit,
      recorded_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const getLatestWeight = async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const { data } = await supabase
    .from('weight_history')
    .select('*')
    .eq('user_id', user.id)
    .order('recorded_date', { ascending: false })
    .limit(1)
    .single()

  return data
}

/* ==============================
   STREAK SYSTEM
============================== */
export const getStreak = async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data
}

export const updateStreak = async (calories, target) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const isHit = calories >= target * 0.8

  const { data: streak } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const current = isHit ? (streak?.current_streak || 0) + 1 : 0

  const { data, error } = await supabase
    .from('user_streaks')
    .upsert({
      user_id: user.id,
      current_streak: current,
      best_streak: Math.max(current, streak?.best_streak || 0),
      last_updated: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/* ==============================
   TEST CONNECTION
============================== */
export async function testConnection() {
  const { data, error } = await supabase
    .from('users_data')
    .select('*')

  console.log("DATA:", data)
  console.log("ERROR:", error)
}