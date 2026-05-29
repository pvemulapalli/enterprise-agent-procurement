export type ProcurementStatus =
  | "draft"
  | "submitted"
  | "policy_checked"
  | "approved"
  | "vendors_compared"
  | "payment_executed";

export type VendorComparisonPhase = "idle" | "running" | "complete";

export type AuditEventType =
  | "request_created"
  | "wallet_verified"
  | "policy_checked"
  | "approval_required"
  | "approval_granted"
  | "vendor_comparison_complete"
  | "vendor_selected"
  | "payment_ready"
  | "payment_executed";

export type AuditEvent = {
  id: string;
  type: AuditEventType;
  label: string;
  timestamp: Date;
};

export type PolicyCheckResult = "approval_required" | "auto_approved";

export type VendorStatus = "Approved supplier" | "Conditional approval" | "Not approved";

export type VendorQuote = {
  vendor: string;
  price: number;
  taxEstimate: number;
  shippingCost: number;
  deliveryEstimate: string;
  vendorStatus: VendorStatus;
  totalLandedCost: number;
  selected?: boolean;
  selectionReason?: string;
};

export type ActivityEntryStatus = "info" | "success" | "warning" | "pending";

export type ActivityEntry = {
  id: string;
  kind: "human" | "crossmint";
  title: string;
  message?: string;
  timestamp: Date;
  status: ActivityEntryStatus;
  /** Crossmint HTTP endpoint or SDK operation name for trace display. */
  endpoint?: string;
  httpMethod?: string;
  /** Monotonic order for stable sorting when timestamps collide. */
  sequence?: number;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
};

export type LilysProcurementRequest = {
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  department: string;
  productName: string;
  productSku: string;
  productSpecs: string[];
  estimatedRetailPrice: number;
  employeeApprovalLimit: number;
  category: string;
  businessReason: string;
  status: ProcurementStatus;
};

export type PolicyRules = {
  employeeApprovalLimitUsd: number;
  paymentRail: string;
};

export type OrderSummary = {
  vendor: string;
  unitPrice: number;
  tax: number;
  shipping: number;
  total: number;
  deliveryEstimate: string;
  vendorStatus: VendorStatus;
  transactionHash?: string;
  explorerLink?: string;
};
