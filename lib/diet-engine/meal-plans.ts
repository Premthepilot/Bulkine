// ============================================
// MEAL PLANS DATA
// Indian-friendly, vegetarian, affordable foods
// ============================================

import type { MealItem, MealPlanTemplate } from './types';

// ============================================
// BREAKFAST OPTIONS
// ============================================

export const breakfastOptions: Record<string, MealItem[]> = {
  planA: [
    {
      name: 'Banana Peanut Butter Shake',
      calories: 450,
      protein: 15,
      description: '2 bananas + 2 tbsp peanut butter + milk',
      isLiquid: true,
    },
    {
      name: 'Poha with Peanuts',
      calories: 280,
      protein: 8,
      description: 'Flattened rice with peanuts and vegetables',
    },
  ],
  planB: [
    {
      name: 'Oats with Milk & Banana',
      calories: 400,
      protein: 14,
      description: '1 cup oats + full cream milk + banana + honey',
      isLiquid: false,
    },
    {
      name: 'Peanut Butter Toast',
      calories: 320,
      protein: 12,
      description: '2 whole wheat bread slices + peanut butter',
    },
  ],
  planC: [
    {
      name: 'Besan Chilla',
      calories: 300,
      protein: 14,
      description: '2 gram flour pancakes with vegetables',
    },
    {
      name: 'Milk Shake',
      calories: 350,
      protein: 12,
      description: 'Full cream milk + banana + almonds',
      isLiquid: true,
    },
  ],
};

// ============================================
// LUNCH OPTIONS
// ============================================

export const lunchOptions: Record<string, MealItem[]> = {
  planA: [
    {
      name: 'Rice with Dal',
      calories: 450,
      protein: 15,
      description: '2 cups rice + 1 bowl dal (toor/masoor)',
    },
    {
      name: 'Paneer Bhurji',
      calories: 280,
      protein: 18,
      description: '100g paneer scrambled with spices',
    },
    {
      name: 'Curd',
      calories: 100,
      protein: 4,
      description: '1 bowl fresh curd',
    },
  ],
  planB: [
    {
      name: 'Roti with Paneer Curry',
      calories: 500,
      protein: 22,
      description: '3 rotis + paneer curry (150g paneer)',
    },
    {
      name: 'Raita',
      calories: 80,
      protein: 3,
      description: 'Yogurt with cucumber',
    },
    {
      name: 'Salad',
      calories: 50,
      protein: 2,
      description: 'Fresh cucumber, tomato, onion',
    },
  ],
  planC: [
    {
      name: 'Khichdi',
      calories: 400,
      protein: 14,
      description: 'Rice + moong dal cooked together with ghee',
    },
    {
      name: 'Aloo Gobi',
      calories: 200,
      protein: 5,
      description: 'Potato cauliflower curry',
    },
    {
      name: 'Buttermilk',
      calories: 60,
      protein: 3,
      description: '1 glass chaas',
      isLiquid: true,
    },
  ],
};

// ============================================
// DINNER OPTIONS
// ============================================

export const dinnerOptions: Record<string, MealItem[]> = {
  planA: [
    {
      name: 'Roti with Rajma',
      calories: 480,
      protein: 18,
      description: '3 rotis + kidney bean curry',
    },
    {
      name: 'Mixed Vegetable',
      calories: 150,
      protein: 5,
      description: 'Seasonal vegetables sabzi',
    },
    {
      name: 'Rice',
      calories: 200,
      protein: 4,
      description: '1 cup steamed rice',
    },
  ],
  planB: [
    {
      name: 'Chole with Bhature',
      calories: 550,
      protein: 16,
      description: 'Chickpea curry with 2 bhature',
    },
    {
      name: 'Onion Salad',
      calories: 30,
      protein: 1,
      description: 'Fresh onion rings with lemon',
    },
    {
      name: 'Sweet Lassi',
      calories: 180,
      protein: 6,
      description: '1 glass thick lassi',
      isLiquid: true,
    },
  ],
  planC: [
    {
      name: 'Paratha with Curd',
      calories: 400,
      protein: 12,
      description: '2 aloo parathas with butter',
    },
    {
      name: 'Dal Fry',
      calories: 200,
      protein: 10,
      description: 'Tempered yellow dal',
    },
    {
      name: 'Pickle & Onion',
      calories: 50,
      protein: 1,
      description: 'Mango pickle with onion',
    },
  ],
};

// ============================================
// SNACK OPTIONS
// ============================================

export const snackOptions: Record<string, MealItem[]> = {
  planA: [
    {
      name: 'Roasted Peanuts',
      calories: 200,
      protein: 9,
      description: '50g salted peanuts',
    },
    {
      name: 'Banana',
      calories: 105,
      protein: 1,
      description: '1 large banana',
    },
    {
      name: 'Milk',
      calories: 150,
      protein: 8,
      description: '1 glass full cream milk',
      isLiquid: true,
    },
  ],
  planB: [
    {
      name: 'Chana Chaat',
      calories: 180,
      protein: 8,
      description: 'Spiced chickpea salad',
    },
    {
      name: 'Mixed Nuts',
      calories: 220,
      protein: 6,
      description: 'Almonds, cashews, walnuts (40g)',
    },
    {
      name: 'Fruit Juice',
      calories: 120,
      protein: 1,
      description: '1 glass fresh juice',
      isLiquid: true,
    },
  ],
  planC: [
    {
      name: 'Boiled Eggs (for eggetarian)',
      calories: 155,
      protein: 13,
      description: '2 whole boiled eggs',
    },
    {
      name: 'Makhana',
      calories: 180,
      protein: 5,
      description: 'Roasted fox nuts with ghee',
    },
    {
      name: 'Coconut Water',
      calories: 45,
      protein: 2,
      description: '1 coconut water',
      isLiquid: true,
    },
  ],
};

// Vegetarian alternative for Plan C snack
export const vegetarianSnackPlanC: MealItem[] = [
  {
    name: 'Paneer Cubes',
    calories: 160,
    protein: 14,
    description: '50g fresh paneer with black pepper',
  },
  {
    name: 'Makhana',
    calories: 180,
    protein: 5,
    description: 'Roasted fox nuts with ghee',
  },
  {
    name: 'Coconut Water',
    calories: 45,
    protein: 2,
    description: '1 coconut water',
    isLiquid: true,
  },
];

// ============================================
// MEAL PLAN TEMPLATES
// ============================================

export const mealPlanTemplates: MealPlanTemplate[] = [
  {
    id: 'A',
    breakfast: breakfastOptions.planA,
    lunch: lunchOptions.planA,
    dinner: dinnerOptions.planA,
    snacks: snackOptions.planA,
  },
  {
    id: 'B',
    breakfast: breakfastOptions.planB,
    lunch: lunchOptions.planB,
    dinner: dinnerOptions.planB,
    snacks: snackOptions.planB,
  },
  {
    id: 'C',
    breakfast: breakfastOptions.planC,
    lunch: lunchOptions.planC,
    dinner: dinnerOptions.planC,
    snacks: snackOptions.planC,
  },
];

// ============================================
// HIGH CALORIE / LIQUID OPTIONS
// For low appetite users
// ============================================

export const liquidCalorieOptions: MealItem[] = [
  {
    name: 'Weight Gainer Shake',
    calories: 500,
    protein: 20,
    description: 'Banana + oats + peanut butter + milk + honey',
    isLiquid: true,
  },
  {
    name: 'Sattu Drink',
    calories: 300,
    protein: 12,
    description: 'Roasted gram flour drink with jaggery',
    isLiquid: true,
  },
  {
    name: 'Badam Milk',
    calories: 280,
    protein: 10,
    description: 'Almond milk with saffron and sugar',
    isLiquid: true,
  },
  {
    name: 'Mango Lassi',
    calories: 250,
    protein: 8,
    description: 'Thick yogurt shake with mango',
    isLiquid: true,
  },
  {
    name: 'Dry Fruit Milkshake',
    calories: 400,
    protein: 14,
    description: 'Dates, figs, and nuts blended with milk',
    isLiquid: true,
  },
];

// ============================================
// EXTRA TASK OPTIONS
// For fully committed users
// ============================================

export const extraTaskOptions: MealItem[] = [
  {
    name: 'Pre-bed Casein Shake',
    calories: 250,
    protein: 15,
    description: 'Milk with almonds before sleep',
    isLiquid: true,
  },
  {
    name: 'Mid-morning Snack',
    calories: 200,
    protein: 8,
    description: 'Handful of mixed nuts',
  },
  {
    name: 'Post-workout Banana',
    calories: 150,
    protein: 2,
    description: '1 banana + 1 tbsp peanut butter',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get plan template by ID
 */
export function getPlanTemplate(planId: 'A' | 'B' | 'C'): MealPlanTemplate {
  return mealPlanTemplates.find((p) => p.id === planId) ?? mealPlanTemplates[0];
}

/**
 * Get plan type for a given day (1-7)
 * Day 1 → A, Day 2 → B, Day 3 → C, repeat
 */
export function getPlanTypeForDay(day: number): 'A' | 'B' | 'C' {
  const types: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  return types[(day - 1) % 3];
}

/**
 * Get day name from day number (1-7)
 */
export function getDayName(day: number): string {
  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  return days[(day - 1) % 7];
}

/**
 * Calculate total calories from meal items
 */
export function calculateMealTotal(items: MealItem[]): {
  calories: number;
  protein: number;
} {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
    }),
    { calories: 0, protein: 0 }
  );
}

/**
 * Scale meal items to match target calories
 */
export function scaleMealToTarget(
  items: MealItem[],
  targetCalories: number
): MealItem[] {
  const currentTotal = calculateMealTotal(items).calories;

  if (currentTotal === 0) return items;

  const scaleFactor = targetCalories / currentTotal;

  return items.map((item) => ({
    ...item,
    calories: Math.round(item.calories * scaleFactor),
    protein: Math.round(item.protein * scaleFactor),
  }));
}
