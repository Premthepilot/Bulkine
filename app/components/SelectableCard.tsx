interface SelectableCardProps {
  emoji: string;
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}

export default function SelectableCard({
  emoji,
  label,
  description,
  selected,
  onClick,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 p-4 rounded-2xl bg-white text-left
        border-2 transition-all duration-200 cursor-pointer
        shadow-sm hover:shadow-md active:scale-[0.98]
        ${
          selected
            ? "border-[#4F46E5] shadow-[0_0_0_4px_rgba(79,70,229,0.1)]"
            : "border-transparent hover:border-[#4F46E5]/30"
        }
      `}
    >
      <span className="text-3xl shrink-0 w-12 h-12 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden">
        {emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#0F172A] text-base leading-snug">{label}</p>
        {description && (
          <p className="text-sm text-slate-500 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <span
        className={`
          shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
          ${selected ? "border-[#4F46E5] bg-[#4F46E5]" : "border-slate-300 bg-white"}
        `}
      >
        {selected && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 12 12"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l2.5 2.5L10 3.5" />
          </svg>
        )}
      </span>
    </button>
  );
}
