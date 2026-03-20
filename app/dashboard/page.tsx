'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import LottieAnimation from '../components/animations/LottieAnimation';
import { taskComplete } from '../components/animations/lottieData';

interface Task {
  id: string;
  title: string;
  emoji: string;
  completed: boolean;
}

const INITIAL_TASKS: Task[] = [
  { id: 'shake', title: 'Drink banana shake', emoji: '🍌', completed: false },
  { id: 'meals', title: 'Eat 4 meals', emoji: '🍽️', completed: false },
  { id: 'workout', title: 'Complete workout', emoji: '💪', completed: false },
  { id: 'water', title: 'Drink 3L water', emoji: '💧', completed: false },
];

const MOTIVATIONAL_TEXTS = [
  { threshold: 0, text: "Let's start growing" },
  { threshold: 25, text: "You're building momentum" },
  { threshold: 50, text: "Halfway there!" },
  { threshold: 75, text: "You're getting stronger" },
  { threshold: 100, text: "Unstoppable!" },
];

function getMotivationalText(progress: number) {
  for (let i = MOTIVATIONAL_TEXTS.length - 1; i >= 0; i--) {
    if (progress >= MOTIVATIONAL_TEXTS[i].threshold) {
      return MOTIVATIONAL_TEXTS[i].text;
    }
  }
  return MOTIVATIONAL_TEXTS[0].text;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [calories, setCalories] = useState(1800);
  const [streak, setStreak] = useState(2);
  const [baseProgress] = useState(15);
  const [showTasks, setShowTasks] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const bodyControls = useAnimation();

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const targetCalories = 2800;

  const bodyProgress = Math.min(baseProgress + completedCount * 20, 100);
  const motivationalText = getMotivationalText(bodyProgress);

  // Pulse animation on task completion
  useEffect(() => {
    if (justCompleted) {
      bodyControls.start({
        scale: [1, 1.05, 1],
        transition: { duration: 0.6, ease: 'easeOut' },
      });
      setJustCompleted(false);
    }
  }, [justCompleted, bodyControls]);

  const toggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const wasCompleted = task?.completed;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );

    if (!wasCompleted) {
      setJustCompleted(true);
      setShowCompletionAnimation(true);

      // Hide animation after it completes
      setTimeout(() => {
        setShowCompletionAnimation(false);
      }, 750);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-orange-400/10 blur-[150px] pointer-events-none"
        style={{ opacity: 0.4 + (bodyProgress / 100) * 0.6 }}
      />

      {/* Top Section - Minimal Stats */}
      <header className="relative z-10 px-6 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{calories}</span>
            <span className="text-slate-400"> / {targetCalories} kcal</span>
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-base">🔥</span>
            <span className="text-sm font-medium text-slate-700">{streak} day streak</span>
          </div>
        </div>
      </header>

      {/* Center Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Large Progress Number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="relative">
            <span className="text-8xl font-bold text-slate-900 tabular-nums tracking-tight">
              {Math.round(bodyProgress)}
            </span>
            <span className="text-4xl font-semibold text-slate-300 ml-1">%</span>
          </div>
        </motion.div>

        {/* Body Visual */}
        <motion.div
          animate={bodyControls}
          className="relative my-8"
        >
          <div className="relative w-28 h-44">
            {/* Empty silhouette */}
            <svg
              viewBox="0 0 100 180"
              className="absolute inset-0 w-full h-full"
              fill="none"
            >
              <path
                d="M50 0C58 0 65 7 65 16C65 25 58 32 50 32C42 32 35 25 35 16C35 7 42 0 50 0Z
                   M30 40H70C75 40 80 45 80 52V90C80 95 77 98 73 98H70V130C70 140 65 145 58 145H56V175C56 178 53 180 50 180C47 180 44 178 44 175V145H42C35 145 30 140 30 130V98H27C23 98 20 95 20 90V52C20 45 25 40 30 40Z"
                fill="#E8ECF0"
              />
            </svg>

            {/* Filled silhouette */}
            <motion.div
              className="absolute inset-0 w-full h-full"
              initial={{ clipPath: 'inset(100% 0 0 0)' }}
              animate={{ clipPath: `inset(${100 - bodyProgress}% 0 0 0)` }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <svg
                viewBox="0 0 100 180"
                className="w-full h-full"
                fill="none"
              >
                <defs>
                  <linearGradient id="fillGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#EA580C" />
                    <stop offset="100%" stopColor="#FB923C" />
                  </linearGradient>
                </defs>
                <path
                  d="M50 0C58 0 65 7 65 16C65 25 58 32 50 32C42 32 35 25 35 16C35 7 42 0 50 0Z
                     M30 40H70C75 40 80 45 80 52V90C80 95 77 98 73 98H70V130C70 140 65 145 58 145H56V175C56 178 53 180 50 180C47 180 44 178 44 175V145H42C35 145 30 140 30 130V98H27C23 98 20 95 20 90V52C20 45 25 40 30 40Z"
                  fill="url(#fillGradient)"
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>

        {/* Motivational Text */}
        <motion.p
          key={motivationalText}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-lg text-slate-600 font-medium"
        >
          {motivationalText}
        </motion.p>

        {/* Task Progress Dots */}
        <div className="flex items-center gap-2 mt-6">
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ scale: 0.8 }}
              animate={{
                scale: task.completed ? 1 : 0.8,
                backgroundColor: task.completed ? '#F97316' : '#E2E8F0'
              }}
              className="w-2 h-2 rounded-full"
            />
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {completedCount}/{totalTasks} tasks today
        </p>
      </main>

      {/* Bottom Section - CTA */}
      <footer className="relative z-10 px-6 pb-10 pt-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowTasks(true)}
          className="w-full py-4 bg-slate-900 text-white font-semibold rounded-2xl shadow-lg shadow-slate-900/20 active:shadow-md transition-shadow"
        >
          {completedCount === 0 ? "Start today's tasks" : completedCount === totalTasks ? 'All done! 🎉' : 'Continue tasks'}
        </motion.button>
      </footer>

      {/* Tasks Bottom Sheet */}
      <AnimatePresence>
        {showTasks && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTasks(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-50 max-h-[85vh] overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 pb-4 pt-2 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Today&apos;s Tasks</h2>
                  <button
                    onClick={() => setShowTasks(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {completedCount} of {totalTasks} completed
                </p>
              </div>

              {/* Tasks List */}
              <div className="px-6 py-4 space-y-3 overflow-y-auto max-h-[60vh]">
                {tasks.map((task, index) => (
                  <motion.button
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => toggleTask(task.id)}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200
                      ${task.completed ? 'bg-orange-50' : 'bg-slate-50'}
                    `}
                  >
                    {/* Checkbox */}
                    <div
                      className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                        ${task.completed ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}
                      `}
                    >
                      {task.completed && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3.5 h-3.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </motion.svg>
                      )}
                    </div>

                    {/* Emoji */}
                    <span className="text-2xl">{task.emoji}</span>

                    {/* Title */}
                    <span
                      className={`
                        flex-1 text-left font-medium transition-colors
                        ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}
                      `}
                    >
                      {task.title}
                    </span>

                    {/* Done badge */}
                    {task.completed && (
                      <span className="text-xs font-semibold text-orange-500 bg-orange-100 px-2.5 py-1 rounded-full">
                        Done
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Bottom padding for safe area */}
              <div className="h-8" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Task Completion Animation Overlay */}
      <AnimatePresence>
        {showCompletionAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <LottieAnimation
              animationData={taskComplete}
              width={120}
              height={120}
              loop={false}
              autoplay
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
