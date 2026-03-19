"use client";

import { useState } from "react";
import ProgressBar from "./components/ProgressBar";
import SelectableCard from "./components/SelectableCard";
import ContinueButton from "./components/ContinueButton";

const BODY_TYPE_OPTIONS = [
  {
    id: "very-skinny",
    emoji: "🦴",
    label: "Very skinny, can't gain weight",
    description: "High metabolism, hard gainer, struggle to put on size",
  },
  {
    id: "tried-gym",
    emoji: "🏋️",
    label: "Tried gym but no results",
    description: "Put in the work but the gains just won't come",
  },
  {
    id: "low-appetite",
    emoji: "🍽️",
    label: "Low appetite",
    description: "Eating enough feels like a challenge every day",
  },
];

export default function Home() {
  const [selected, setSelected] = useState<string | null>(null);

  function handleContinue() {
    if (!selected) return;
    // Navigate to next onboarding step
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-start py-8 px-4">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-[#4F46E5]">
              Bulkine
            </span>
            <span className="text-2xl">💪</span>
          </div>
          <ProgressBar currentStep={1} totalSteps={8} />
        </div>

        {/* Title section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0F172A] leading-tight">
            What describes you best?
          </h1>
          <p className="text-base text-slate-500">
            We&apos;ll personalize your plan
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {BODY_TYPE_OPTIONS.map((option) => (
            <SelectableCard
              key={option.id}
              emoji={option.emoji}
              label={option.label}
              description={option.description}
              selected={selected === option.id}
              onClick={() => setSelected(option.id)}
            />
          ))}
        </div>

        {/* Motivational hint */}
        {selected && (
          <div className="flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl px-4 py-3 transition-all duration-300">
            <span className="text-[#22C55E] text-lg">✅</span>
            <p className="text-sm font-medium text-[#166534]">
              Great choice! Let&apos;s build your perfect plan.
            </p>
          </div>
        )}

        {/* Continue button */}
        <ContinueButton disabled={!selected} onClick={handleContinue} />

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400">
          Takes less than 2 minutes &middot; No credit card required
        </p>
      </div>
    </div>
  );
}

