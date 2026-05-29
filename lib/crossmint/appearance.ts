import type { UIConfig } from "@crossmint/common-sdk-base";

/** Crossmint embedded UI theme aligned with the enterprise fintech palette. */
export const crossmintAppearance: UIConfig = {
  borderRadius: "10px",
  fontSizeBase: "14px",
  spacingUnit: "4px",
  fontWeightPrimary: "500",
  fontWeightSecondary: "400",
  colors: {
    background: "#0f172a",
    backgroundSecondary: "#1e293b",
    backgroundTertiary: "#334155",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    accent: "#10b981",
    buttonBackground: "#10b981",
    border: "#334155",
    inputBackground: "#1e293b",
    danger: "#f87171",
    textLink: "#34d399",
  },
};
