'use client';

import { motion } from 'framer-motion';

interface SelectableCardProps {
  id: string;
  emoji?: string;
  title: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export default function SelectableCard({
  id,
  emoji,
  title,
  isSelected,
  onSelect,
  disabled = false,
}: SelectableCardProps) {
  const handleClick = () => {
    if (disabled) return;
    onSelect(id);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full px-6 py-5 rounded-[20px] text-left overflow-hidden
        min-h-[68px]
        ${disabled ? 'pointer-events-none' : ''}
        ${isSelected ? '' : 'bg-gray-100 hover:bg-gray-150 active:bg-gray-200'}
      `}
    >
      {/* Left-to-right fill animation layer */}
      <motion.div
        initial={false}
        animate={{
          width: isSelected ? '100%' : '0%',
        }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="absolute left-0 top-0 h-full bg-orange-500"
        style={{ zIndex: 0 }}
      />

      {/* Content layer */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        {/* Title */}
        <span
          className={`flex-1 text-[17px] font-semibold leading-snug transition-colors duration-300 ${
            isSelected ? 'text-white' : 'text-gray-900'
          }`}
        >
          {title}
        </span>

        {/* Checkmark - only show when selected */}
        {isSelected && (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="flex-shrink-0 w-6 h-6 text-white"
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
      </div>
    </motion.button>
  );
}
