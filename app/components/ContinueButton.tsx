interface ContinueButtonProps {
  disabled: boolean;
  onClick: () => void;
  label?: string;
}

export default function ContinueButton({
  disabled,
  onClick,
  label = "Continue",
}: ContinueButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full py-4 rounded-2xl font-semibold text-base tracking-wide
        transition-all duration-200
        ${
          disabled
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-[#4F46E5] text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600 active:scale-[0.98] cursor-pointer"
        }
      `}
    >
      {label}
    </button>
  );
}
