import { crossmintConfig } from "@/lib/crossmint/config";

import type { LilysProcurementRequest, VendorQuote } from "./types";

function formatChainLabel(chain: string): string {
  return chain
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const LILYS_BOUTIQUE = {
  name: "Lily's Boutique",
  tagline: "Niche Fashion Marketplace",
} as const;

/** Product sourced from Apple MXK73LL/A listing */
export const MAGIC_KEYBOARD_PRODUCT = {
  sku: "MXK73LL/A",
  shortName: "Magic Keyboard with Touch ID and Numeric Keypad",
  name:
    "Magic Keyboard with Touch ID and Numeric Keypad for Mac models with Apple silicon (USB–C) — US English, White Keys",
  imageUrl:
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MXK73?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=d0dMVFphZTh2YTQyb0pHekNNbjdSZ2tuVHYzMERCZURia3c5SzJFOTlPanVCdEVHeHhPSGNpL2MzN05PekJuUXJoN1hCTUVacmhJZEQrWXRXUTNKUUE",
  specs: [
    "Wireless keyboard with Touch ID fingerprint sensor",
    "Built-in numeric keypad",
    "USB-C connectivity for Mac with Apple silicon",
    "US English layout, white keys",
    "Rechargeable internal battery",
  ],
  manufacturerUrl:
    "https://www.apple.com/shop/product/mxk73ll/a/magic-keyboard-with-touch-id-and-numeric-keypad-for-mac-models-with-apple-silicon-usb-c-us-english-white-keys",
  estimatedRetailPrice: 179,
} as const;

export const LILYS_REQUEST_DEFAULTS: Omit<LilysProcurementRequest, "status"> = {
  employeeName: "April Summers",
  employeeEmail: "april.lilysboutique@outlook.com",
  employeeRole: "Finance Associate",
  department: "Finance",
  productName: MAGIC_KEYBOARD_PRODUCT.name,
  productSku: MAGIC_KEYBOARD_PRODUCT.sku,
  productSpecs: [...MAGIC_KEYBOARD_PRODUCT.specs],
  estimatedRetailPrice: MAGIC_KEYBOARD_PRODUCT.estimatedRetailPrice,
  employeeApprovalLimit: 100,
  category: "Office Equipment",
  businessReason: "Replacement keyboard for finance workstation",
};

/** Demo SHI recipient — external Phantom wallet on Base Sepolia (payee, not a signer). */
export const SHI_VENDOR_TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_SHI_VENDOR_TREASURY_ADDRESS ??
  "0x7996eE8bA9AC0B67dCFd7873970445b4d88c0744";

export const LILYS_POLICY = {
  employeeApprovalLimitUsd: 100,
  paymentRail: `Stablecoin settlement on ${formatChainLabel(crossmintConfig.chain)} via Crossmint embedded payment rail`,
};

export const VENDOR_QUOTES: VendorQuote[] = [
  {
    vendor: "SHI",
    price: 174.99,
    taxEstimate: 14.44,
    shippingCost: 0,
    deliveryEstimate: "2 business days",
    vendorStatus: "Approved supplier",
    totalLandedCost: 189.43,
    selected: true,
    selectionReason:
      "Lowest total landed cost among approved suppliers with contract pricing and free shipping.",
  },
  {
    vendor: "CDW",
    price: 179.0,
    taxEstimate: 14.77,
    shippingCost: 12.99,
    deliveryEstimate: "3 business days",
    vendorStatus: "Approved supplier",
    totalLandedCost: 206.76,
  },
  {
    vendor: "Amazon Business",
    price: 179.0,
    taxEstimate: 14.77,
    shippingCost: 0,
    deliveryEstimate: "1 business day",
    vendorStatus: "Conditional approval",
    totalLandedCost: 193.77,
  },
  {
    vendor: "Office Depot",
    price: 189.99,
    taxEstimate: 15.67,
    shippingCost: 9.99,
    deliveryEstimate: "5 business days",
    vendorStatus: "Approved supplier",
    totalLandedCost: 215.65,
  },
];

export const SELECTED_VENDOR =
  VENDOR_QUOTES.find((quote) => quote.selected) ?? VENDOR_QUOTES[0];

export const AUDIT_EVENT_LABELS: Record<
  import("./types").AuditEventType,
  string
> = {
  request_created: "Procurement request submitted",
  wallet_verified: "Crossmint payment account verified",
  policy_checked: "Spend policy evaluated",
  approval_required: "Manager approval required",
  approval_granted: "Request approved by operator",
  vendor_comparison_complete: "Vendor comparison completed",
  vendor_selected: "SHI selected as supplier",
  payment_ready: "Payment execution staged",
  payment_executed: "USDC disbursement submitted on-chain",
};

export const WORKFLOW_ACTIONS = [
  "submit_request",
  "run_policy_check",
  "approve_request",
  "compare_vendors",
  "execute_payment",
] as const;

export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

export const ACTION_LABELS: Record<WorkflowAction, string> = {
  submit_request: "Submit request",
  run_policy_check: "Run policy check",
  approve_request: "Approve request",
  compare_vendors: "Compare vendors",
  execute_payment: "Execute payment",
};
