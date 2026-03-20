'use client';

import { useCallback } from 'react';

interface WeightSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export default function WeightSlider({
  value,
  onChange,
  min = 40,
  max = 120,
  unit = 'kg',
}: WeightSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  return (
    <div className="w-full pt-4">
      {/* Large Number Display */}
      <div className="text-center mb-12">
        <span className="text-6xl font-bold text-gray-900 tabular-nums">
          {value}
        </span>
        <span className="text-2xl font-medium text-gray-400 ml-2">
          {unit}
        </span>
      </div>

      {/* Single Slider */}
      <div className="relative h-12">
        {/* Visual Track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-gray-200 rounded-full">
          <div
            className="h-full bg-orange-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Visual Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-6 h-6 -ml-3 rounded-full bg-orange-500 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        </div>

        {/* Invisible Native Input (interaction layer) */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          className="slider-input absolute inset-0 w-full h-full cursor-pointer opacity-0"
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
          aria-label={`Weight: ${value} ${unit}`}
        />
      </div>

      {/* Min/Max Labels */}
      <div className="flex justify-between mt-4">
        <span className="text-sm text-gray-400">{min} {unit}</span>
        <span className="text-sm text-gray-400">{max} {unit}</span>
      </div>
    </div>
  );
}
