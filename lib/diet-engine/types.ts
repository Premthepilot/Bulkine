// ============================================
// DIET ENGINE TYPES
// ============================================

/** User input for diet plan generation */
export interface UserProfile {
  weight: number;          // Current weight in kg
  height: number;          // Height in cm
  goalWeight: number;      // Target weight in kg
  workoutFrequency: WorkoutFrequency;
  bodyType: BodyType;
  commitment: CommitmentLevel;
  dietPreference?: DietPreference;
  appetiteLevel?: AppetiteLevel;
  mealsPerDay?: MealsPerDay;
}

export type WorkoutFrequency = 'none' | '1-2' | '3-5' | 'daily';
export type BodyType = 'very skinny' | 'no results' | 'low appetite';
export type CommitmentLevel = 'casual' | 'serious' | 'fully committed';
export type DietPreference = 'vegetarian' | 'non-veg' | 'eggetarian';
export type AppetiteLevel = 'struggle' | 'normal' | 'lot';
export type MealsPerDay = '2' | '3' | '4+';

/** A single meal item with nutritional info */
export interface MealItem {
  name: string;
  calories: number;
  protein: number;        // grams
  description: string;
  isLiquid?: boolean;     // For low appetite personalization
}

/** A complete meal with multiple items */
export interface Meal {
  items: MealItem[];
  totalCalories: number;
  totalProtein: number;
}

/** Meals for a single day */
export interface DayMeals {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: Meal;
}

/** A daily task for the user */
export interface Task {
  id: string;
  title: string;
  kcal: number;
  description: string;
  time?: string;          // Suggested time (e.g., "8:00 AM")
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'extra';
  completed: boolean;
}

/** Plan for a single day */
export interface DayPlan {
  day: number;            // 1-7
  dayName: string;        // "Monday", "Tuesday", etc.
  planType: 'A' | 'B' | 'C';
  meals: DayMeals;
  tasks: Task[];
  targetCalories: number;
}

/** Complete weekly plan output */
export interface WeeklyPlanOutput {
  targetCalories: number;
  maintenanceCalories: number;
  surplus: number;
  proteinTarget: number;  // grams per day
  weeklyPlan: DayPlan[];
  todayPlan: DayPlan;
  tasks: Task[];          // Today's tasks
  personalizations: string[];  // Applied personalization rules
}

/** Meal distribution percentages */
export interface MealDistribution {
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
}

/** Meal plan template */
export interface MealPlanTemplate {
  id: 'A' | 'B' | 'C';
  breakfast: MealItem[];
  lunch: MealItem[];
  dinner: MealItem[];
  snacks: MealItem[];
}
