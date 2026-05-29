export type ActivityEntryStatus = "info" | "success" | "warning" | "pending";

export type ActivityEntry = {
  id: string;
  kind: "human" | "crossmint";
  title: string;
  message?: string;
  timestamp: Date;
  status: ActivityEntryStatus;
  /** Crossmint infrastructure operations only */
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
};

export type WizardStep = 0 | 1 | 2 | 3 | 4;

export const WIZARD_STEP_LABELS = [
  "Request",
  "Policy",
  "Approval",
  "Vendors",
  "Payment",
] as const;
