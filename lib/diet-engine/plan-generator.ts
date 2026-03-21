// ============================================
// PLAN GENERATOR
// Personalized weekly plan generation
// ============================================

import type {
  UserProfile,
  DayPlan,
  DayMeals,
  Meal,
  Task,
  WeeklyPlanOutput,
  MealItem,
} from './types';
import {
  calculateTargetCalories,
  calculateProteinTarget,
  getMealDistribution,
  calculateMealCalories,
} from './calorie-calculator';
import {
  getPlanTemplate,
  getPlanTypeForDay,
  getDayName,
  calculateMealTotal,
  scaleMealToTarget,
  liquidCalorieOptions,
  extraTaskOptions,
  vegetarianSnackPlanC,
} from './meal-plans';

// ============================================
// TASK GENERATION
// ============================================

/**
 * Generate a unique task ID
 */
function generateTaskId(mealType: string, index: number): string {
  return `${mealType}-${Date.now()}-${index}`;
}

/**
 * Get suggested time for meal type
 */
function getMealTime(mealType: string): string {
  const times: Record<string, string> = {
    breakfast: '8:00 AM',
    'mid-morning': '10:30 AM',
    lunch: '1:00 PM',
    'afternoon-snack': '4:00 PM',
    dinner: '8:00 PM',
    'pre-bed': '10:00 PM',
    snack: '4:00 PM',
    extra: '10:30 PM',
  };
  return times[mealType] ?? '12:00 PM';
}

/**
 * Convert meal items to task
 */
function mealToTask(
  items: MealItem[],
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'extra',
  taskTitle: string,
  index: number
): Task {
  const total = calculateMealTotal(items);

  return {
    id: generateTaskId(mealType, index),
    title: taskTitle,
    kcal: total.calories,
    description: items.map((i) => i.name).join(', '),
    time: getMealTime(mealType),
    mealType,
    completed: false,
  };
}

/**
 * Generate tasks for a day's meals
 */
function generateDayTasks(
  meals: DayMeals,
  profile: UserProfile,
  personalizations: string[]
): Task[] {
  const tasks: Task[] = [];
  let taskIndex = 0;

  // Breakfast task
  tasks.push(
    mealToTask(
      meals.breakfast.items,
      'breakfast',
      'Eat breakfast',
      taskIndex++
    )
  );

  // For low appetite, add mid-morning liquid
  if (profile.bodyType === 'low appetite' || profile.appetiteLevel === 'struggle') {
    const liquidOption = liquidCalorieOptions[0];
    tasks.push({
      id: generateTaskId('snack', taskIndex++),
      title: 'Drink calorie shake',
      kcal: liquidOption.calories,
      description: liquidOption.description,
      time: '10:30 AM',
      mealType: 'snack',
      completed: false,
    });
  }

  // Lunch task
  tasks.push(
    mealToTask(meals.lunch.items, 'lunch', 'Eat lunch', taskIndex++)
  );

  // Afternoon snack task
  const snackTitle = meals.snacks.items.some((i) => i.isLiquid)
    ? 'Have snacks & drink'
    : 'Have afternoon snacks';
  tasks.push(
    mealToTask(meals.snacks.items, 'snack', snackTitle, taskIndex++)
  );

  // Dinner task
  tasks.push(
    mealToTask(meals.dinner.items, 'dinner', 'Eat dinner', taskIndex++)
  );

  // Extra task for fully committed users
  if (profile.commitment === 'fully committed') {
    const extraOption = extraTaskOptions[0];
    tasks.push({
      id: generateTaskId('extra', taskIndex++),
      title: 'Pre-bed protein',
      kcal: extraOption.calories,
      description: extraOption.description,
      time: '10:00 PM',
      mealType: 'extra',
      completed: false,
    });
    personalizations.push('Added pre-bed protein for maximum gains');
  }

  return tasks;
}

// ============================================
// MEAL GENERATION
// ============================================

/**
 * Build a complete meal from items with calorie target
 */
function buildMeal(items: MealItem[], targetCalories: number): Meal {
  const scaledItems = scaleMealToTarget(items, targetCalories);
  const totals = calculateMealTotal(scaledItems);

  return {
    items: scaledItems,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
  };
}

/**
 * Generate meals for a single day
 */
function generateDayMeals(
  planType: 'A' | 'B' | 'C',
  mealCalories: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snacks: number;
  },
  profile: UserProfile,
  personalizations: string[]
): DayMeals {
  const template = getPlanTemplate(planType);

  // Get snack items based on diet preference
  let snackItems = template.snacks;
  if (
    planType === 'C' &&
    profile.dietPreference === 'vegetarian'
  ) {
    snackItems = vegetarianSnackPlanC;
    personalizations.push('Replaced eggs with paneer for vegetarian diet');
  }

  // For low appetite users, prioritize liquid items
  let breakfastItems = template.breakfast;
  if (profile.bodyType === 'low appetite' || profile.appetiteLevel === 'struggle') {
    // Move liquid items to front
    breakfastItems = [
      ...template.breakfast.filter((i) => i.isLiquid),
      ...template.breakfast.filter((i) => !i.isLiquid),
    ];
    personalizations.push('Prioritized liquid calories for easier consumption');
  }

  return {
    breakfast: buildMeal(breakfastItems, mealCalories.breakfast),
    lunch: buildMeal(template.lunch, mealCalories.lunch),
    dinner: buildMeal(template.dinner, mealCalories.dinner),
    snacks: buildMeal(snackItems, mealCalories.snacks),
  };
}

// ============================================
// PERSONALIZATION RULES
// ============================================

/**
 * Apply personalization rules to the plan
 */
function applyPersonalizationRules(
  profile: UserProfile,
  targetCalories: number,
  personalizations: string[]
): number {
  let adjustedCalories = targetCalories;

  // Rule 1: Low appetite - increase liquid calories
  if (profile.bodyType === 'low appetite') {
    personalizations.push('Low appetite: Increased liquid-based meals');
  }

  // Rule 2: Very skinny - slight calorie boost
  if (profile.bodyType === 'very skinny') {
    adjustedCalories += 100;
    personalizations.push('Very skinny: Added 100 extra calories');
  }

  // Rule 3: No workout - slightly reduced surplus already handled
  if (profile.workoutFrequency === 'none') {
    personalizations.push('No workout: Moderate surplus for gradual gain');
  }

  // Rule 4: Fully committed - extra task added in task generation
  if (profile.commitment === 'fully committed') {
    adjustedCalories += 100;
    personalizations.push('Fully committed: Extra meal and calories added');
  }

  // Rule 5: High workout frequency
  if (profile.workoutFrequency === 'daily') {
    personalizations.push('Daily workout: Higher calorie target for recovery');
  }

  return adjustedCalories;
}

// ============================================
// MAIN GENERATOR
// ============================================

/**
 * Generate complete weekly plan
 */
export function generateWeeklyPlan(profile: UserProfile): WeeklyPlanOutput {
  const personalizations: string[] = [];

  // Step 1: Calculate base calories
  const { maintenance, surplus, target } = calculateTargetCalories(profile);

  // Step 2: Apply personalization rules
  const adjustedTarget = applyPersonalizationRules(
    profile,
    target,
    personalizations
  );

  // Step 3: Calculate protein target
  const proteinTarget = calculateProteinTarget(profile.weight, profile.commitment);

  // Step 4: Get meal distribution
  const distribution = getMealDistribution(profile.appetiteLevel);
  const mealCalories = calculateMealCalories(adjustedTarget, distribution);

  // Step 5: Generate weekly plan
  const weeklyPlan: DayPlan[] = [];

  for (let day = 1; day <= 7; day++) {
    const planType = getPlanTypeForDay(day);
    const meals = generateDayMeals(
      planType,
      mealCalories,
      profile,
      personalizations
    );
    const tasks = generateDayTasks(meals, profile, personalizations);

    weeklyPlan.push({
      day,
      dayName: getDayName(day),
      planType,
      meals,
      tasks,
      targetCalories: adjustedTarget,
    });
  }

  // Step 6: Get today's plan (default to day 1)
  const todayPlan = weeklyPlan[0];

  // Deduplicate personalizations
  const uniquePersonalizations = [...new Set(personalizations)];

  return {
    targetCalories: adjustedTarget,
    maintenanceCalories: maintenance,
    surplus,
    proteinTarget,
    weeklyPlan,
    todayPlan,
    tasks: todayPlan.tasks,
    personalizations: uniquePersonalizations,
  };
}

/**
 * Get plan for a specific day
 */
export function getDayPlan(
  profile: UserProfile,
  dayNumber: number
): DayPlan {
  const weeklyOutput = generateWeeklyPlan(profile);
  const dayIndex = ((dayNumber - 1) % 7);
  return weeklyOutput.weeklyPlan[dayIndex];
}

/**
 * Recalculate plan when a task is completed
 * Returns updated remaining calories
 */
export function calculateRemainingCalories(
  targetCalories: number,
  completedTasks: Task[]
): number {
  const consumed = completedTasks.reduce((sum, task) => sum + task.kcal, 0);
  return Math.max(0, targetCalories - consumed);
}

/**
 * Get progress percentage
 */
export function calculateProgress(
  consumedCalories: number,
  targetCalories: number
): number {
  if (targetCalories === 0) return 0;
  return Math.min(100, Math.round((consumedCalories / targetCalories) * 100));
}

/**
 * Get motivation message based on progress
 */
export function getMotivationMessage(progress: number): {
  main: string;
  highlight: string;
} {
  if (progress >= 100) {
    return {
      main: 'Amazing work today!',
      highlight: "You've crushed your goal!",
    };
  }
  if (progress >= 75) {
    return {
      main: 'Almost there!',
      highlight: 'Keep pushing!',
    };
  }
  if (progress >= 50) {
    return {
      main: 'Halfway there!',
      highlight: "You're doing great!",
    };
  }
  if (progress >= 25) {
    return {
      main: 'Good start!',
      highlight: 'Keep the momentum going!',
    };
  }
  return {
    main: 'Time to fuel up!',
    highlight: "Let's hit those calories!",
  };
}
