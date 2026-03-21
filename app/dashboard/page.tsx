'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Image from 'next/image';

interface Task {
  id: string;
  title: string;
  kcal: number;
  description: string;
  completed: boolean;
}


const INITIAL_TASKS: Task[] = [
  {
    id: 'shake',
    title: 'Drink protein shake',
    kcal: 400,
    description: 'Post-workout',
    completed: true,
  },
  {
    id: 'lunch',
    title: 'Eat lunch',
    kcal: 600,
    description: 'High carb focus',
    completed: false,
  },
  {
    id: 'snack',
    title: 'Snack',
    kcal: 300,
    description: 'Healthy boost',
    completed: false,
  },
];

const BASE_CALORIES = 800;

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeTab, setActiveTab] = useState('dashboard');
  const baseGoal = 2500;
  const surplus = 300;
  const totalTarget = baseGoal + surplus;

  const mascotControls = useAnimation();
  const prevCaloriesRef = useRef<number>(0);

  const caloriesConsumed = BASE_CALORIES + tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.kcal, 0);

  const progress = Math.min((caloriesConsumed / totalTarget) * 100, 100);

  useEffect(() => {
    if (caloriesConsumed > prevCaloriesRef.current) {
      mascotControls.start({
        scale: [1, 1.08, 1],
        transition: { duration: 0.4, ease: 'easeOut' },
      });
    }
    prevCaloriesRef.current = caloriesConsumed;
  }, [caloriesConsumed, mascotControls]);

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      )
    );
  };

  const getMotivationText = () => {
    const percentage = (caloriesConsumed / totalTarget) * 100;
    if (percentage >= 100) return { main: 'Amazing work today!', highlight: "You've crushed your goal!" };
    if (percentage >= 75) return { main: 'Almost there!', highlight: 'Keep pushing!' };
    if (percentage >= 50) return { main: 'Halfway there!', highlight: "You're doing great!" };
    return { main: 'Your capy buddy is ready for a big meal.', highlight: "Let's fuel up together!" };
  };

  const motivation = getMotivationText();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-sm min-h-screen bg-[#F8F9FA] flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex items-center justify-between">
          <div className="w-14 h-14 rounded-full bg-[#D4A88C] overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-[#E5C4A8] to-[#C4947C]" />
          </div>

          <h1 className="text-2xl font-bold text-orange-600 tracking-tight">
            BULKINE
          </h1>

          <button className="w-10 h-10 flex items-center justify-center text-gray-500">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </header>

        {/* Calorie Display */}
        <div className="px-6 pb-6 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <motion.span
              key={caloriesConsumed}
              initial={{ scale: 1.1, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-6xl font-bold text-gray-900 tabular-nums"
            >
              {caloriesConsumed}
            </motion.span>
            <span className="text-3xl text-gray-400 font-normal">
              /{totalTarget}
            </span>
          </div>
          <p className="text-orange-600 font-bold text-sm tracking-wide mt-1">
            KCAL CONSUMED
          </p>

          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-orange-500 rounded-full"
            />
          </div>

          {/* Context Text */}
          <p className="text-xs text-gray-500 mt-2">
            Includes +{surplus} kcal surplus for muscle gain
          </p>
        </div>

        {/* Mascot Section */}
        <div className="px-6 pb-4 flex justify-center">
          <motion.div
            animate={mascotControls}
            className="relative w-44 h-44"
          >
            <Image
              src="/mascot/capy-workout.png"
              alt="Capybara workout mascot"
              fill
              className="object-contain"
              priority
            />
          </motion.div>
        </div>

        {/* Motivation Text */}
        <div className="px-6 pb-6 text-center">
          <motion.p
            key={motivation.main}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-lg font-bold text-gray-900 leading-tight"
          >
            {motivation.main}{' '}
            <span className="text-orange-600">{motivation.highlight}</span>
          </motion.p>
        </div>

        {/* Calorie Remaining */}
        <div className="px-6 pb-6 text-center">
          <p className="text-base text-gray-600">
            You need{' '}
            <motion.span
              key={caloriesConsumed}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="font-bold text-orange-600"
            >
              {Math.max(0, totalTarget - caloriesConsumed)} kcal
            </motion.span>
            {' '}more today
          </p>
        </div>

        {/* Daily Momentum Section */}
        <div className="px-6 pb-6">
          <h2 className="text-xs font-bold text-gray-400 tracking-widest mb-3">
            DAILY MOMENTUM
          </h2>

          <div className="space-y-3">
            {tasks.map((task) => (
              <motion.button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full flex items-center gap-4 p-4 bg-white rounded-2xl transition-all
                  ${task.completed ? 'opacity-70' : 'opacity-100'}
                `}
              >
                {/* Checkbox */}
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: task.completed ? '#ea580c' : '#ffffff',
                    borderColor: task.completed ? '#ea580c' : '#d1d5db',
                  }}
                  transition={{ duration: 0.2 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                >
                  {task.completed && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  )}
                </motion.div>

                {/* Task Details */}
                <div className="flex-1 text-left">
                  <p className={`text-base font-bold ${task.completed ? 'text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {task.kcal} kcal • {task.description}
                  </p>
                </div>

                {/* Arrow */}
                <svg
                  className="w-5 h-5 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Bottom padding for fixed nav */}
        <div className="h-24" />

        {/* Fixed Bottom Navigation - Floating Pill Style */}
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-6 bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg shadow-gray-900/10">
            {[
              { id: 'dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'workouts', label: 'Workout', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
              { id: 'nutrition', label: 'Food', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
              { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex flex-col items-center gap-0.5 transition-all duration-200
                  ${activeTab === tab.id
                    ? 'text-orange-500 scale-105'
                    : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={activeTab === tab.id ? 2.5 : 2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={tab.icon}
                  />
                </svg>
                <span className={`text-[10px] font-semibold ${activeTab === tab.id ? 'text-orange-500' : ''}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
