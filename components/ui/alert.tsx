type AlertVariant = "error" | "info" | "success";

type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
};

const variantClasses: Record<AlertVariant, string> = {
  error: "border-red-500/30 bg-red-500/10 text-red-200",
  info: "border-slate-600 bg-slate-800/80 text-slate-200",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
};

export function Alert({ variant = "info", title, children }: AlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 text-sm ${variantClasses[variant]}`}
    >
      {title ? <p className="mb-1 font-medium">{title}</p> : null}
      <div className="text-pretty">{children}</div>
    </div>
  );
}
