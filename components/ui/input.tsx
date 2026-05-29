import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({
  label,
  hint,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium uppercase tracking-wide text-slate-400"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`h-11 w-full rounded-lg border bg-slate-900/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? "border-red-500/50" : "border-slate-700"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
