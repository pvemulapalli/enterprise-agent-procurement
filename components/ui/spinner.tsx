type SpinnerProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({ label = "Loading", size = "md" }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <span
        className={`animate-spin rounded-full border-emerald-500 border-t-transparent ${sizeClasses[size]}`}
        aria-hidden="true"
      />
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  );
}
