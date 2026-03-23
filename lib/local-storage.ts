// Local storage utilities for persisting user data

export interface UserProfile {
  weight: number;
  calories: number;
  streak: number;
  goalWeight?: number;
  height?: number;
}

export interface FoodLogEntry {
  id: string;
  food_name: string;
  kcal: number;
  emoji: string | null;
  logged_at: string;
  logged_date: string;
  ingredients: any[] | null;
}

export interface WeightEntry {
  id: string;
  weight: number;
  recorded_date: string;
  recorded_at: string;
}

const STORAGE_KEYS = {
  USER_PROFILE: 'bulkine_user_profile',
  FOOD_LOGS: 'bulkine_food_logs',
  WEIGHT_HISTORY: 'bulkine_weight_history',
  ONBOARDING_COMPLETE: 'bulkine_onboarding_complete',
  USER_PLAN: 'userPlan',
  ONBOARDING_DATA: 'onboardingData',
  LAST_FOOD_LOG_DATE: 'lastFoodLogDate',
  LAST_DASHBOARD_VISIT: 'lastDashboardVisit',
};

// Helper to safely parse JSON from localStorage
function safeJsonParse<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

// Check if user has completed onboarding
export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
}

// Mark onboarding as complete
export function setOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
}

// Get user profile
export function getUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  return safeJsonParse<UserProfile | null>(data, null);
}

// Save user profile
export function saveUserProfile(profile: UserProfile): UserProfile {
  if (typeof window === 'undefined') return profile;
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  return profile;
}

// Update user profile (merge with existing)
export function updateUserProfile(updates: Partial<UserProfile>): UserProfile | null {
  const current = getUserProfile();
  if (!current) return null;
  const updated = { ...current, ...updates };
  return saveUserProfile(updated);
}

// Get all food logs
export function getAllFoodLogs(): FoodLogEntry[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.FOOD_LOGS);
  return safeJsonParse<FoodLogEntry[]>(data, []);
}

// Get food logs for a specific date
export function getFoodLogsByDate(date: string): FoodLogEntry[] {
  const allLogs = getAllFoodLogs();
  return allLogs.filter(log => log.logged_date === date);
}

// Add a food log entry
export function addFoodLog(entry: Omit<FoodLogEntry, 'id' | 'logged_at' | 'logged_date'>): FoodLogEntry {
  const now = new Date();
  const newEntry: FoodLogEntry = {
    ...entry,
    id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    logged_at: now.toISOString(),
    logged_date: now.toISOString().split('T')[0],
  };

  const allLogs = getAllFoodLogs();
  allLogs.unshift(newEntry);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.FOOD_LOGS, JSON.stringify(allLogs));
  }

  return newEntry;
}

// Delete a food log entry
export function deleteFoodLog(id: string): boolean {
  const allLogs = getAllFoodLogs();
  const filtered = allLogs.filter(log => log.id !== id);

  if (filtered.length === allLogs.length) return false;

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.FOOD_LOGS, JSON.stringify(filtered));
  }

  return true;
}

// Get weight history
export function getWeightHistory(): WeightEntry[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.WEIGHT_HISTORY);
  return safeJsonParse<WeightEntry[]>(data, []);
}

// Add or update weight entry for a date
export function addWeightEntry(weight: number, date?: string): WeightEntry {
  const now = new Date();
  const recordedDate = date || now.toISOString().split('T')[0];

  const allEntries = getWeightHistory();

  // Check if entry for this date already exists
  const existingIndex = allEntries.findIndex(e => e.recorded_date === recordedDate);

  const newEntry: WeightEntry = {
    id: `weight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    weight,
    recorded_date: recordedDate,
    recorded_at: now.toISOString(),
  };

  if (existingIndex >= 0) {
    // Update existing entry
    allEntries[existingIndex] = { ...allEntries[existingIndex], weight, recorded_at: now.toISOString() };
  } else {
    // Add new entry and sort by date
    allEntries.push(newEntry);
    allEntries.sort((a, b) => a.recorded_date.localeCompare(b.recorded_date));
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.WEIGHT_HISTORY, JSON.stringify(allEntries));
  }

  return existingIndex >= 0 ? allEntries[existingIndex] : newEntry;
}

// Update streak
export function updateStreak(newStreak: number): UserProfile | null {
  return updateUserProfile({ streak: newStreak });
}

// Get onboarding data
export function getOnboardingData(): any | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.ONBOARDING_DATA);
  return safeJsonParse(data, null);
}

// Save onboarding data
export function saveOnboardingData(data: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_DATA, JSON.stringify(data));
}

// Clear onboarding data
export function clearOnboardingData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.ONBOARDING_DATA);
}

// Get user plan
export function getUserPlan(): any | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.USER_PLAN);
  return safeJsonParse(data, null);
}

// Save user plan
export function saveUserPlan(plan: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USER_PLAN, JSON.stringify(plan));
}

// Clear all data (for reset functionality)
export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
