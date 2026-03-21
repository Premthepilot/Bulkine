// ============================================
// DIET ENGINE - MAIN EXPORT
// ============================================

// Type exports
export type {
  UserProfile,
  WorkoutFrequency,
  BodyType,
  CommitmentLevel,
  DietPreference,
  AppetiteLevel,
  MealsPerDay,
  MealItem,
  Meal,
  DayMeals,
  Task,
  DayPlan,
  WeeklyPlanOutput,
  MealDistribution,
  MealPlanTemplate,
} from './types';

// Calorie calculator exports
export {
  calculateMaintenanceCalories,
  calculateSurplus,
  calculateTargetCalories,
  calculateProteinTarget,
  getMealDistribution,
  calculateMealCalories,
  estimateTimeToGoal,
} from './calorie-calculator';

// Meal plans exports
export {
  breakfastOptions,
  lunchOptions,
  dinnerOptions,
  snackOptions,
  liquidCalorieOptions,
  extraTaskOptions,
  mealPlanTemplates,
  getPlanTemplate,
  getPlanTypeForDay,
  getDayName,
  calculateMealTotal,
  scaleMealToTarget,
} from './meal-plans';

// Plan generator exports
export {
  generateWeeklyPlan,
  getDayPlan,
  calculateRemainingCalories,
  calculateProgress,
  getMotivationMessage,
} from './plan-generator';

// ============================================
// CONVENIENCE FUNCTION
// Generate plan from onboarding data
// ============================================

import type { UserProfile, WeeklyPlanOutput } from './types';
import { generateWeeklyPlan } from './plan-generator';

/**
 * Maps onboarding selections to UserProfile
 */
export function createProfileFromOnboarding(data: {
  // From onboarding page
  bodyType: string;       // 'skinny' | 'no-results' | 'low-appetite'
  mainGoal: string;       // 'gain-weight' | 'build-muscle' | 'improve-appetite' | 'stay-consistent'
  workoutFrequency: string; // 'none' | '1-2' | '3-5' | 'daily'
  height: number;
  weight: number;
  goalWeight: number;
  commitment: string;     // 'very-serious' | 'serious' | 'exploring'
  // From setup page
  appetite?: string;      // 'struggle' | 'normal' | 'lot'
  mealsPerDay?: string;   // '2' | '3' | '4+'
  dietPreference?: string; // 'vegetarian' | 'non-veg' | 'eggetarian'
}): UserProfile {
  // Map body type
  const bodyTypeMap: Record<string, 'very skinny' | 'no results' | 'low appetite'> = {
    'skinny': 'very skinny',
    'no-results': 'no results',
    'low-appetite': 'low appetite',
  };

  // Map commitment
  const commitmentMap: Record<string, 'casual' | 'serious' | 'fully committed'> = {
    'very-serious': 'fully committed',
    'serious': 'serious',
    'exploring': 'casual',
  };

  // Map workout frequency
  const workoutMap: Record<string, 'none' | '1-2' | '3-5' | 'daily'> = {
    'none': 'none',
    '1-2': '1-2',
    '3-5': '3-5',
    'daily': 'daily',
  };

  // Map appetite
  const appetiteMap: Record<string, 'struggle' | 'normal' | 'lot'> = {
    'struggle': 'struggle',
    'normal': 'normal',
    'lot': 'lot',
  };

  // Map diet preference
  const dietMap: Record<string, 'vegetarian' | 'non-veg' | 'eggetarian'> = {
    'vegetarian': 'vegetarian',
    'non-veg': 'non-veg',
    'eggetarian': 'eggetarian',
  };

  // Map meals per day
  const mealsMap: Record<string, '2' | '3' | '4+'> = {
    '2': '2',
    '3': '3',
    '4+': '4+',
  };

  return {
    weight: data.weight,
    height: data.height,
    goalWeight: data.goalWeight,
    workoutFrequency: workoutMap[data.workoutFrequency] ?? 'none',
    bodyType: bodyTypeMap[data.bodyType] ?? 'very skinny',
    commitment: commitmentMap[data.commitment] ?? 'serious',
    dietPreference: data.dietPreference ? dietMap[data.dietPreference] : undefined,
    appetiteLevel: data.appetite ? appetiteMap[data.appetite] : undefined,
    mealsPerDay: data.mealsPerDay ? mealsMap[data.mealsPerDay] : undefined,
  };
}

/**
 * One-liner to generate plan from onboarding data
 */
export function generatePlanFromOnboarding(onboardingData: Parameters<typeof createProfileFromOnboarding>[0]): WeeklyPlanOutput {
  const profile = createProfileFromOnboarding(onboardingData);
  return generateWeeklyPlan(profile);
}
