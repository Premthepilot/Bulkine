// ============================================
// USE DIET PLAN - React Hook
// ============================================

'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Task, WeeklyPlanOutput, DayPlan } from './types';
import {
  generateWeeklyPlan,
  createProfileFromOnboarding,
  calculateProgress,
  getMotivationMessage,
} from './index';

interface UseDietPlanOptions {
  // From onboarding
  bodyType: string;
  mainGoal: string;
  workoutFrequency: string;
  height: number;
  weight: number;
  goalWeight: number;
  commitment: string;
  // From setup (optional)
  appetite?: string;
  mealsPerDay?: string;
  dietPreference?: string;
}

interface UseDietPlanReturn {
  // Plan data
  plan: WeeklyPlanOutput | null;
  todayPlan: DayPlan | null;
  tasks: Task[];

  // Calorie tracking
  targetCalories: number;
  consumedCalories: number;
  remainingCalories: number;
  progress: number;

  // Motivation
  motivation: { main: string; highlight: string };

  // Actions
  toggleTask: (taskId: string) => void;
  resetTasks: () => void;
  setDayNumber: (day: number) => void;

  // Loading state
  isLoading: boolean;
  error: string | null;
}

/**
 * React hook for managing diet plan state
 */
export function useDietPlan(options: UseDietPlanOptions): UseDietPlanReturn {
  const [currentDay, setCurrentDay] = useState(1);
  const [taskStates, setTaskStates] = useState<Record<string, boolean>>({});
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // Generate the plan (memoized)
  const plan = useMemo(() => {
    try {
      const profile = createProfileFromOnboarding({
        bodyType: options.bodyType,
        mainGoal: options.mainGoal,
        workoutFrequency: options.workoutFrequency,
        height: options.height,
        weight: options.weight,
        goalWeight: options.goalWeight,
        commitment: options.commitment,
        appetite: options.appetite,
        mealsPerDay: options.mealsPerDay,
        dietPreference: options.dietPreference,
      });
      return generateWeeklyPlan(profile);
    } catch {
      return null;
    }
  }, [
    options.bodyType,
    options.mainGoal,
    options.workoutFrequency,
    options.height,
    options.weight,
    options.goalWeight,
    options.commitment,
    options.appetite,
    options.mealsPerDay,
    options.dietPreference,
  ]);

  // Get today's plan
  const todayPlan = useMemo(() => {
    if (!plan) return null;
    const dayIndex = (currentDay - 1) % 7;
    return plan.weeklyPlan[dayIndex];
  }, [plan, currentDay]);

  // Get tasks with completion state
  const tasks = useMemo(() => {
    if (!todayPlan) return [];
    return todayPlan.tasks.map((task) => ({
      ...task,
      completed: taskStates[task.id] ?? task.completed,
    }));
  }, [todayPlan, taskStates]);

  // Calculate consumed calories
  const consumedCalories = useMemo(() => {
    return tasks
      .filter((t) => t.completed)
      .reduce((sum, t) => sum + t.kcal, 0);
  }, [tasks]);

  // Target calories
  const targetCalories = plan?.targetCalories ?? 2500;

  // Remaining calories
  const remainingCalories = Math.max(0, targetCalories - consumedCalories);

  // Progress percentage
  const progress = calculateProgress(consumedCalories, targetCalories);

  // Motivation message
  const motivation = getMotivationMessage(progress);

  // Toggle task completion
  const toggleTask = useCallback((taskId: string) => {
    setTaskStates((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }, []);

  // Reset all tasks
  const resetTasks = useCallback(() => {
    setTaskStates({});
  }, []);

  // Set current day
  const setDayNumber = useCallback((day: number) => {
    setCurrentDay(day);
    setTaskStates({}); // Reset task states when changing day
  }, []);

  return {
    plan,
    todayPlan,
    tasks,
    targetCalories,
    consumedCalories,
    remainingCalories,
    progress,
    motivation,
    toggleTask,
    resetTasks,
    setDayNumber,
    isLoading,
    error,
  };
}

/**
 * Get current day of week (1-7, Monday = 1)
 */
export function getCurrentDayOfWeek(): number {
  const today = new Date();
  const day = today.getDay();
  // Convert Sunday (0) to 7, Monday (1) stays 1, etc.
  return day === 0 ? 7 : day;
}
