type LilysBoutiqueLogoProps = {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { icon: 28, name: "text-base", tagline: "text-[10px]" },
  md: { icon: 36, name: "text-xl", tagline: "text-xs" },
  lg: { icon: 44, name: "text-2xl", tagline: "text-sm" },
};

export function LilysBoutiqueLogo({
  variant = "dark",
  size = "md",
}: LilysBoutiqueLogoProps) {
  const s = sizes[size];
  const nameColor = variant === "light" ? "text-slate-900" : "text-slate-100";
  const taglineColor = variant === "light" ? "text-rose-600" : "text-rose-300";

  return (
    <div className="flex items-center gap-3">
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="24" cy="24" r="23" className="fill-rose-500/15 stroke-rose-400/40" strokeWidth="1" />
        <path
          d="M24 10c0 4-2 7-6 8 4 1 6 4 6 8s-2 7-6 8c4-1 6-4 6-8s2-7 6-8c-4-1-6-4-6-8z"
          className="fill-rose-400/90"
        />
        <path
          d="M24 28v10M20 36h8"
          className="stroke-rose-500/80"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="leading-tight">
        <p className={`font-serif font-semibold tracking-tight ${nameColor} ${s.name}`}>
          Lily&apos;s Boutique
        </p>
        <p className={`font-medium uppercase tracking-[0.12em] ${taglineColor} ${s.tagline}`}>
          Niche Fashion Marketplace
        </p>
      </div>
    </div>
  );
}
