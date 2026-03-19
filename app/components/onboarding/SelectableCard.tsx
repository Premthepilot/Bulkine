'use client';

interface SelectableCardProps {
  id: string;
  emoji: string;
  title: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function SelectableCard({
  id,
  emoji,
  title,
  isSelected,
  onSelect,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`
        relative w-full px-4 py-4 rounded-xl text-left
        bg-white border transition-all duration-200 ease-out
        active:scale-[0.97] active:shadow-none
        ${
          isSelected
            ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-100'
            : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
        }
      `}
    >
      <div className="flex items-center gap-4">
        {/* Icon container */}
        <div
          className={`
            flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center
            transition-all duration-200 ease-out
            ${isSelected ? 'bg-orange-100 scale-105' : 'bg-slate-50'}
          `}
        >
          <span
            className={`
              text-2xl transition-transform duration-200
              ${isSelected ? 'scale-110' : ''}
            `}
            role="img"
            aria-hidden="true"
          >
            {emoji}
          </span>
        </div>

        {/* Title */}
        <span
          className={`
            flex-1 text-sm font-medium leading-tight
            transition-colors duration-200
            ${isSelected ? 'text-slate-900' : 'text-slate-700'}
          `}
        >
          {title}
        </span>

        {/* Checkbox indicator */}
        <div
          className={`
            flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
            transition-all duration-200 ease-out
            ${
              isSelected
                ? 'bg-orange-500 border-orange-500 scale-110'
                : 'border-slate-300 bg-white'
            }
          `}
        >
          <svg
            className={`
              w-3 h-3 text-white transition-all duration-200
              ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
            `}
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
          </svg>
        </div>
      </div>
    </button>
  );
}
