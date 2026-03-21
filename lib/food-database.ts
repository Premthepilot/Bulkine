// ============================================
// FOOD DATABASE
// Common foods with calorie information
// ============================================

export interface Ingredient {
  name: string;
  kcal: number;
}

export interface FoodItem {
  id: string;
  name: string;
  kcal: number;
  category: 'indian' | 'snack' | 'drink' | 'protein' | 'grain' | 'fruit' | 'fast-food';
  emoji: string;
  ingredients?: Ingredient[];
}

export const FOOD_DATABASE: FoodItem[] = [
  // Indian foods
  {
    id: 'rice-dal',
    name: 'Rice + Dal',
    kcal: 450,
    category: 'indian',
    emoji: '🍚',
    ingredients: [
      { name: 'Rice (2 cups)', kcal: 260 },
      { name: 'Dal', kcal: 150 },
      { name: 'Ghee', kcal: 40 },
    ]
  },
  { id: 'roti', name: 'Roti (1 piece)', kcal: 80, category: 'indian', emoji: '🫓' },
  {
    id: 'paratha',
    name: 'Paratha',
    kcal: 150,
    category: 'indian',
    emoji: '🫓',
    ingredients: [
      { name: 'Wheat flour', kcal: 80 },
      { name: 'Oil/Ghee', kcal: 70 },
    ]
  },
  {
    id: 'aloo-paratha',
    name: 'Aloo Paratha',
    kcal: 220,
    category: 'indian',
    emoji: '🫓',
    ingredients: [
      { name: 'Wheat flour', kcal: 80 },
      { name: 'Potato filling', kcal: 70 },
      { name: 'Oil/Ghee', kcal: 70 },
    ]
  },
  {
    id: 'paneer-curry',
    name: 'Paneer Curry',
    kcal: 280,
    category: 'indian',
    emoji: '🧀',
    ingredients: [
      { name: 'Paneer (100g)', kcal: 180 },
      { name: 'Gravy', kcal: 60 },
      { name: 'Oil', kcal: 40 },
    ]
  },
  { id: 'chole', name: 'Chole (Chickpea)', kcal: 200, category: 'indian', emoji: '🫘' },
  { id: 'rajma', name: 'Rajma (Kidney Bean)', kcal: 210, category: 'indian', emoji: '🫘' },
  { id: 'dal-fry', name: 'Dal Fry', kcal: 180, category: 'indian', emoji: '🥣' },
  {
    id: 'khichdi',
    name: 'Khichdi',
    kcal: 350,
    category: 'indian',
    emoji: '🍚',
    ingredients: [
      { name: 'Rice', kcal: 150 },
      { name: 'Moong dal', kcal: 120 },
      { name: 'Ghee', kcal: 80 },
    ]
  },
  {
    id: 'poha',
    name: 'Poha',
    kcal: 250,
    category: 'indian',
    emoji: '🍚',
    ingredients: [
      { name: 'Flattened rice', kcal: 150 },
      { name: 'Peanuts', kcal: 60 },
      { name: 'Oil', kcal: 40 },
    ]
  },
  { id: 'upma', name: 'Upma', kcal: 230, category: 'indian', emoji: '🍚' },
  { id: 'idli', name: 'Idli (2 pieces)', kcal: 140, category: 'indian', emoji: '🥟' },
  { id: 'dosa', name: 'Dosa', kcal: 170, category: 'indian', emoji: '🥞' },
  {
    id: 'samosa',
    name: 'Samosa',
    kcal: 260,
    category: 'indian',
    emoji: '🥟',
    ingredients: [
      { name: 'Outer crust', kcal: 100 },
      { name: 'Potato filling', kcal: 80 },
      { name: 'Oil (fried)', kcal: 80 },
    ]
  },
  {
    id: 'biryani',
    name: 'Veg Biryani',
    kcal: 400,
    category: 'indian',
    emoji: '🍚',
    ingredients: [
      { name: 'Basmati rice', kcal: 200 },
      { name: 'Vegetables', kcal: 80 },
      { name: 'Ghee & spices', kcal: 120 },
    ]
  },
  { id: 'pulao', name: 'Pulao', kcal: 320, category: 'indian', emoji: '🍚' },

  // Protein sources
  { id: 'egg-boiled', name: 'Boiled Egg', kcal: 70, category: 'protein', emoji: '🥚' },
  {
    id: 'egg-omelette',
    name: 'Egg Omelette',
    kcal: 150,
    category: 'protein',
    emoji: '🍳',
    ingredients: [
      { name: 'Eggs (2)', kcal: 140 },
      { name: 'Oil/Butter', kcal: 40 },
      { name: 'Onion & veggies', kcal: 20 },
    ]
  },
  { id: 'paneer-100g', name: 'Paneer (100g)', kcal: 265, category: 'protein', emoji: '🧀' },
  { id: 'chicken-breast', name: 'Chicken Breast', kcal: 165, category: 'protein', emoji: '🍗' },
  { id: 'tofu', name: 'Tofu (100g)', kcal: 80, category: 'protein', emoji: '🧈' },

  // Drinks
  { id: 'milk', name: 'Milk (1 glass)', kcal: 150, category: 'drink', emoji: '🥛' },
  {
    id: 'lassi',
    name: 'Lassi',
    kcal: 180,
    category: 'drink',
    emoji: '🥛',
    ingredients: [
      { name: 'Yogurt', kcal: 100 },
      { name: 'Sugar', kcal: 60 },
      { name: 'Water', kcal: 0 },
      { name: 'Cardamom', kcal: 20 },
    ]
  },
  { id: 'buttermilk', name: 'Buttermilk', kcal: 60, category: 'drink', emoji: '🥛' },
  {
    id: 'protein-shake',
    name: 'Protein Shake',
    kcal: 250,
    category: 'drink',
    emoji: '🥤',
    ingredients: [
      { name: 'Protein powder', kcal: 120 },
      { name: 'Milk', kcal: 100 },
      { name: 'Banana', kcal: 30 },
    ]
  },
  {
    id: 'banana-shake',
    name: 'Banana Shake',
    kcal: 300,
    category: 'drink',
    emoji: '🍌',
    ingredients: [
      { name: 'Banana (2)', kcal: 180 },
      { name: 'Milk', kcal: 100 },
      { name: 'Sugar', kcal: 20 },
    ]
  },
  {
    id: 'mango-shake',
    name: 'Mango Shake',
    kcal: 280,
    category: 'drink',
    emoji: '🥭',
    ingredients: [
      { name: 'Mango pulp', kcal: 150 },
      { name: 'Milk', kcal: 100 },
      { name: 'Sugar', kcal: 30 },
    ]
  },
  { id: 'coconut-water', name: 'Coconut Water', kcal: 45, category: 'drink', emoji: '🥥' },
  { id: 'fruit-juice', name: 'Fresh Juice', kcal: 120, category: 'drink', emoji: '🧃' },

  // Snacks
  { id: 'peanuts', name: 'Peanuts (50g)', kcal: 280, category: 'snack', emoji: '🥜' },
  { id: 'almonds', name: 'Almonds (30g)', kcal: 170, category: 'snack', emoji: '🥜' },
  { id: 'cashews', name: 'Cashews (30g)', kcal: 160, category: 'snack', emoji: '🥜' },
  { id: 'makhana', name: 'Makhana', kcal: 180, category: 'snack', emoji: '🍿' },
  { id: 'biscuits', name: 'Biscuits (4 pcs)', kcal: 140, category: 'snack', emoji: '🍪' },
  { id: 'namkeen', name: 'Namkeen Mix', kcal: 200, category: 'snack', emoji: '🥨' },

  // Grains & Bread
  {
    id: 'oats',
    name: 'Oats (1 bowl)',
    kcal: 300,
    category: 'grain',
    emoji: '🥣',
    ingredients: [
      { name: 'Oats', kcal: 150 },
      { name: 'Milk', kcal: 100 },
      { name: 'Honey/Sugar', kcal: 50 },
    ]
  },
  { id: 'bread-slice', name: 'Bread (1 slice)', kcal: 80, category: 'grain', emoji: '🍞' },
  {
    id: 'pb-toast',
    name: 'Peanut Butter Toast',
    kcal: 250,
    category: 'grain',
    emoji: '🍞',
    ingredients: [
      { name: 'Bread (2 slices)', kcal: 160 },
      { name: 'Peanut butter', kcal: 90 },
    ]
  },
  {
    id: 'cornflakes',
    name: 'Cornflakes + Milk',
    kcal: 280,
    category: 'grain',
    emoji: '🥣',
    ingredients: [
      { name: 'Cornflakes', kcal: 130 },
      { name: 'Milk', kcal: 120 },
      { name: 'Sugar', kcal: 30 },
    ]
  },

  // Fruits
  { id: 'banana', name: 'Banana', kcal: 105, category: 'fruit', emoji: '🍌' },
  { id: 'apple', name: 'Apple', kcal: 95, category: 'fruit', emoji: '🍎' },
  { id: 'mango', name: 'Mango', kcal: 150, category: 'fruit', emoji: '🥭' },
  { id: 'orange', name: 'Orange', kcal: 60, category: 'fruit', emoji: '🍊' },
  { id: 'grapes', name: 'Grapes (1 cup)', kcal: 100, category: 'fruit', emoji: '🍇' },
  { id: 'papaya', name: 'Papaya', kcal: 120, category: 'fruit', emoji: '🍈' },

  // Fast food
  {
    id: 'pizza-slice',
    name: 'Pizza Slice',
    kcal: 280,
    category: 'fast-food',
    emoji: '🍕',
    ingredients: [
      { name: 'Crust', kcal: 100 },
      { name: 'Cheese', kcal: 110 },
      { name: 'Sauce & toppings', kcal: 70 },
    ]
  },
  {
    id: 'burger',
    name: 'Burger',
    kcal: 300,
    category: 'fast-food',
    emoji: '🍔',
    ingredients: [
      { name: 'Bun', kcal: 120 },
      { name: 'Patty', kcal: 100 },
      { name: 'Cheese', kcal: 50 },
      { name: 'Sauce & veggies', kcal: 30 },
    ]
  },
  { id: 'fries', name: 'French Fries', kcal: 320, category: 'fast-food', emoji: '🍟' },
  {
    id: 'sandwich',
    name: 'Sandwich',
    kcal: 250,
    category: 'fast-food',
    emoji: '🥪',
    ingredients: [
      { name: 'Bread', kcal: 120 },
      { name: 'Cheese', kcal: 80 },
      { name: 'Butter & veggies', kcal: 50 },
    ]
  },
  {
    id: 'noodles',
    name: 'Noodles',
    kcal: 350,
    category: 'fast-food',
    emoji: '🍜',
    ingredients: [
      { name: 'Noodles', kcal: 200 },
      { name: 'Vegetables', kcal: 50 },
      { name: 'Oil & sauce', kcal: 100 },
    ]
  },
  {
    id: 'fried-rice',
    name: 'Fried Rice',
    kcal: 380,
    category: 'fast-food',
    emoji: '🍚',
    ingredients: [
      { name: 'Rice', kcal: 200 },
      { name: 'Vegetables', kcal: 60 },
      { name: 'Oil', kcal: 80 },
      { name: 'Soy sauce', kcal: 40 },
    ]
  },
  {
    id: 'momos',
    name: 'Momos (6 pcs)',
    kcal: 240,
    category: 'fast-food',
    emoji: '🥟',
    ingredients: [
      { name: 'Wrapper', kcal: 100 },
      { name: 'Vegetable filling', kcal: 80 },
      { name: 'Oil (steamed/fried)', kcal: 60 },
    ]
  },
  {
    id: 'pav-bhaji',
    name: 'Pav Bhaji',
    kcal: 400,
    category: 'fast-food',
    emoji: '🍛',
    ingredients: [
      { name: 'Pav (2 pcs)', kcal: 160 },
      { name: 'Bhaji', kcal: 150 },
      { name: 'Butter', kcal: 90 },
    ]
  },
];

/**
 * Search foods by name
 */
export function searchFoods(query: string): FoodItem[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  return FOOD_DATABASE.filter(
    (food) => food.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 6); // Limit to 6 results
}

/**
 * Get popular/suggested foods
 */
export function getPopularFoods(): FoodItem[] {
  return [
    FOOD_DATABASE.find(f => f.id === 'rice-dal')!,
    FOOD_DATABASE.find(f => f.id === 'roti')!,
    FOOD_DATABASE.find(f => f.id === 'milk')!,
    FOOD_DATABASE.find(f => f.id === 'banana')!,
    FOOD_DATABASE.find(f => f.id === 'egg-boiled')!,
  ];
}
