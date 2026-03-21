// ============================================
// CALORIE CALCULATOR
// ============================================

import type {
  UserProfile,
  WorkoutFrequency,
  BodyType,
  CommitmentLevel,
  MealDistribution,
} from './types';

/**
 * Calculate maintenance calories based on weight and activity level
 * Base formula: weight (kg) * 32
 */
export function calculateMaintenanceCalories(
  weight: number,
  workoutFrequency: WorkoutFrequency
): number {
  // Base maintenance calculation
  let maintenance = weight * 32;

  // Adjust based on workout frequency
  switch (workoutFrequency) {
    case 'daily':
      maintenance += 200;
      break;
    case '3-5':
      maintenance += 100;
      break;
    case '1-2':
      // No adjustment
      break;
    case 'none':
      maintenance -= 100;
      break;
  }

  return Math.round(maintenance);
}

/**
 * Calculate caloric surplus for bulking
 * Base surplus: +300 kcal
 */
export function calculateSurplus(
  bodyType: BodyType,
  commitment: CommitmentLevel,
  workoutFrequency: WorkoutFrequency
): number {
  // Base surplus
  let surplus = 300;

  // Adjust based on body type
  if (bodyType === 'very skinny') {
    surplus += 100; // Extra for hardgainers
  }

  // Adjust based on commitment
  switch (commitment) {
    case 'fully committed':
      surplus += 100;
      break;
    case 'serious':
      // No adjustment
      break;
    case 'casual':
      surplus -= 100;
      break;
  }

  // Reduce surplus for no workout
  if (workoutFrequency === 'none') {
    surplus -= 50;
  }

  return Math.max(surplus, 150); // Minimum 150 kcal surplus
}

/**
 * Calculate target calories (maintenance + surplus)
 */
export function calculateTargetCalories(profile: UserProfile): {
  maintenance: number;
  surplus: number;
  target: number;
} {
  const maintenance = calculateMaintenanceCalories(
    profile.weight,
    profile.workoutFrequency
  );

  const surplus = calculateSurplus(
    profile.bodyType,
    profile.commitment,
    profile.workoutFrequency
  );

  return {
    maintenance,
    surplus,
    target: maintenance + surplus,
  };
}

/**
 * Calculate daily protein target
 * Formula: 1.6-2.2g per kg bodyweight for muscle gain
 */
export function calculateProteinTarget(
  weight: number,
  commitment: CommitmentLevel
): number {
  // Protein multiplier based on commitment
  let multiplier: number;
  switch (commitment) {
    case 'fully committed':
      multiplier = 2.0;
      break;
    case 'serious':
      multiplier = 1.8;
      break;
    case 'casual':
      multiplier = 1.6;
      break;
    default:
      multiplier = 1.8;
  }

  return Math.round(weight * multiplier);
}

/**
 * Get meal distribution percentages
 * Default: breakfast 25%, lunch 30%, dinner 30%, snacks 15%
 */
export function getMealDistribution(
  appetiteLevel?: string
): MealDistribution {
  // For low appetite, redistribute to more frequent smaller meals
  if (appetiteLevel === 'struggle') {
    return {
      breakfast: 20,
      lunch: 25,
      dinner: 25,
      snacks: 30, // More snacks for easier eating
    };
  }

  // Standard distribution
  return {
    breakfast: 25,
    lunch: 30,
    dinner: 30,
    snacks: 15,
  };
}

/**
 * Calculate calories for each meal based on target and distribution
 */
export function calculateMealCalories(
  targetCalories: number,
  distribution: MealDistribution
): {
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
} {
  return {
    breakfast: Math.round(targetCalories * (distribution.breakfast / 100)),
    lunch: Math.round(targetCalories * (distribution.lunch / 100)),
    dinner: Math.round(targetCalories * (distribution.dinner / 100)),
    snacks: Math.round(targetCalories * (distribution.snacks / 100)),
  };
}

/**
 * Estimate time to reach goal weight
 * Healthy weight gain: 0.25-0.5 kg per week
 */
export function estimateTimeToGoal(
  currentWeight: number,
  goalWeight: number,
  commitment: CommitmentLevel
): { weeks: number; months: number } {
  const weightToGain = goalWeight - currentWeight;

  if (weightToGain <= 0) {
    return { weeks: 0, months: 0 };
  }

  // Weekly gain rate based on commitment
  let weeklyGain: number;
  switch (commitment) {
    case 'fully committed':
      weeklyGain = 0.5;
      break;
    case 'serious':
      weeklyGain = 0.4;
      break;
    case 'casual':
      weeklyGain = 0.25;
      break;
    default:
      weeklyGain = 0.35;
  }

  const weeks = Math.ceil(weightToGain / weeklyGain);
  const months = Math.ceil(weeks / 4);

  return { weeks, months };
}
