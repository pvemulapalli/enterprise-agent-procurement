"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AUDIT_EVENT_LABELS,
  LILYS_POLICY,
  LILYS_REQUEST_DEFAULTS,
  SELECTED_VENDOR,
  SHI_VENDOR_TREASURY_ADDRESS,
  VENDOR_QUOTES,
  type WorkflowAction,
} from "@/lib/procurement/lilys-boutique";
import type {
  ActivityEntry,
  AuditEvent,
  AuditEventType,
  LilysProcurementRequest,
  OrderSummary,
  PolicyCheckResult,
  ProcurementStatus,
  VendorComparisonPhase,
  VendorQuote,
} from "@/lib/procurement/types";
import type { WizardStep } from "@/lib/procurement/wizard";
import { crossmintConfig } from "@/lib/crossmint/config";
import { crossmintApiEndpoints } from "@/lib/crossmint/endpoints";
import {
  getPaymentToken,
  getStablecoinEnvironmentNote,
  getTransactionExplorerLink,
  isStagingChain,
  STAGING_TREASURY_RESERVE_USDXM,
} from "@/lib/crossmint/payment";
import { treasuryConfig } from "@/lib/crossmint/treasury-config";
import {
  TREASURY_WALLET_DEMO_MODE,
  TREASURY_WALLET_DEMO_DISCLAIMER,
} from "@/lib/crossmint/treasury-demo";
import type {
  CorporateTreasuryStatus,
  TreasuryPaymentOptions,
} from "@/hooks/use-corporate-treasury";

const VENDOR_SOURCING_STEPS = [
  "Querying SHI contract catalog…",
  "Pulling CDW punchout pricing…",
  "Checking Amazon Business eligibility…",
  "Requesting Office Depot quote…",
  "Scoring total landed cost and supplier relationships…",
] as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createAuditEvent(type: AuditEventType, timestamp = new Date()): AuditEvent {
  return {
    id: `${type}-${timestamp.getTime()}`,
    type,
    label: AUDIT_EVENT_LABELS[type],
    timestamp,
  };
}

function appendAuditEvent(events: AuditEvent[], type: AuditEventType): AuditEvent[] {
  if (events.some((event) => event.type === type)) return events;
  return [...events, createAuditEvent(type)];
}

function statusToStep(status: ProcurementStatus): WizardStep {
  switch (status) {
    case "draft":
      return 0;
    case "submitted":
      return 1;
    case "policy_checked":
      return 2;
    case "approved":
      return 3;
    case "vendors_compared":
    case "payment_executed":
      return 4;
  }
}

function nextActionForStatus(status: ProcurementStatus): WorkflowAction | null {
  switch (status) {
    case "draft":
      return "submit_request";
    case "submitted":
      return "run_policy_check";
    case "policy_checked":
      return "approve_request";
    case "approved":
      return null;
    case "vendors_compared":
      return "execute_payment";
    default:
      return null;
  }
}

type LilysProcurementWorkflowDeps = {
  executeTreasuryPayment?: (
    amountUsd: number,
    options?: TreasuryPaymentOptions,
  ) => Promise<{ hash: string; explorerLink?: string; simulated?: boolean }>;
  fundTreasuryStaging?: () => Promise<{
    funded?: boolean;
    fundAmount?: number;
    calls?: Array<{
      callIndex: number;
      amountUsdxm: number;
      endpoint: string;
      crossmintResponse: unknown;
    }>;
    balanceBefore?: number;
    balanceAfter?: number;
  }>;
  treasuryStatus?: CorporateTreasuryStatus;
  treasuryBalance?: number | null;
  onTreasuryRefresh?: () => void;
};

export function useLilysProcurementWorkflow(
  deps: LilysProcurementWorkflowDeps = {},
) {
  const {
    executeTreasuryPayment,
    fundTreasuryStaging,
    treasuryStatus = "loading",
    treasuryBalance = null,
    onTreasuryRefresh,
  } = deps;

  const [status, setStatus] = useState<ProcurementStatus>("draft");
  const [viewStep, setViewStep] = useState<WizardStep>(0);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [activityTrace, setActivityTrace] = useState<ActivityEntry[]>([]);
  const [vendorQuotes, setVendorQuotes] = useState<VendorQuote[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorQuote | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [vendorComparisonPhase, setVendorComparisonPhase] =
    useState<VendorComparisonPhase>("idle");
  const [agentStepIndex, setAgentStepIndex] = useState(0);
  const [isExecutingPayment, setIsExecutingPayment] = useState(false);
  const [isFundingTreasury, setIsFundingTreasury] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const walletSyncedRef = useRef(false);
  const comparisonRunningRef = useRef(false);
  const stagingFundInFlightRef = useRef(false);
  const treasuryReserveMetRef = useRef(false);
  const activitySeqRef = useRef(0);

  const nextActivitySeq = useCallback(() => {
    activitySeqRef.current += 1;
    return activitySeqRef.current;
  }, []);

  const request: LilysProcurementRequest = {
    ...LILYS_REQUEST_DEFAULTS,
    status,
  };

  const policyResult: PolicyCheckResult =
    request.estimatedRetailPrice > LILYS_POLICY.employeeApprovalLimitUsd
      ? "approval_required"
      : "auto_approved";

  const maxStep = statusToStep(status);

  const appendHuman = useCallback(
    (
      title: string,
      message: string,
      entryStatus: ActivityEntry["status"] = "info",
    ) => {
      const timestamp = new Date();
      const sequence = nextActivitySeq();
      setActivityTrace((current) => [
        ...current,
        {
          id: `human-${timestamp.getTime()}-${sequence}`,
          kind: "human",
          title,
          message,
          timestamp,
          status: entryStatus,
          sequence,
        },
      ]);
    },
    [nextActivitySeq],
  );

  const appendCrossmint = useCallback(
    (
      title: string,
      options: {
        message?: string;
        endpoint?: string;
        method?: string;
        request?: Record<string, unknown>;
        response?: Record<string, unknown>;
        status?: ActivityEntry["status"];
      } = {},
    ) => {
      const timestamp = new Date();
      const sequence = nextActivitySeq();
      setActivityTrace((current) => [
        ...current,
        {
          id: `crossmint-${timestamp.getTime()}-${sequence}`,
          kind: "crossmint",
          title,
          message: options.message,
          timestamp,
          status: options.status ?? "success",
          endpoint: options.endpoint,
          httpMethod: options.method,
          sequence,
          request: options.request,
          response: options.response,
        },
      ]);
    },
    [nextActivitySeq],
  );

  useEffect(() => {
    if (walletSyncedRef.current) return;
    walletSyncedRef.current = true;

    setAuditEvents((current) => appendAuditEvent(current, "wallet_verified"));
    appendCrossmint("Corporate treasury wallet connected", {
      message: TREASURY_WALLET_DEMO_MODE
        ? `Company treasury ${treasuryConfig.alias} (${treasuryConfig.displayName}) — demo mode, simulated balance.`
        : `Company treasury ${treasuryConfig.alias} (${treasuryConfig.displayName}).`,
      method: crossmintApiEndpoints.treasuryConnect.method,
      endpoint: crossmintApiEndpoints.treasuryConnect.upstream,
      request: {
        operation: "treasury.connect",
        appRoute: crossmintApiEndpoints.treasuryConnect.path,
        locator: treasuryConfig.address,
        alias: treasuryConfig.alias,
        owner: "COMPANY",
        displayName: treasuryConfig.displayName,
        chain: crossmintConfig.chain,
        demoMode: TREASURY_WALLET_DEMO_MODE,
      },
      response: {
        provider: "crossmint",
        paymentAccount: treasuryConfig.address,
        alias: treasuryConfig.alias,
        accountType: "company_treasury",
        owner: "COMPANY",
        status: "active",
        simulated: TREASURY_WALLET_DEMO_MODE,
      },
    });
  }, [appendCrossmint]);

  const runStagingTreasuryFund = useCallback(async () => {
    if (!fundTreasuryStaging || !isStagingChain(crossmintConfig.chain)) return;
    if (treasuryReserveMetRef.current) return;
    if (
      treasuryBalance !== null &&
      treasuryBalance >= STAGING_TREASURY_RESERVE_USDXM
    ) {
      treasuryReserveMetRef.current = true;
      return;
    }

    const topUpUsd =
      treasuryBalance !== null
        ? Math.max(0, STAGING_TREASURY_RESERVE_USDXM - treasuryBalance)
        : STAGING_TREASURY_RESERVE_USDXM;

    setIsFundingTreasury(true);
    appendCrossmint("Treasury staging fund requested", {
      message: TREASURY_WALLET_DEMO_MODE
        ? `Simulating $${STAGING_TREASURY_RESERVE_USDXM} USDXM treasury reserve (demo mode).`
        : `Provisioning $${STAGING_TREASURY_RESERVE_USDXM} USDXM reserve (${getStablecoinEnvironmentNote(crossmintConfig.chain)})`,
      method: crossmintApiEndpoints.treasuryFundStaging.method,
      endpoint: crossmintApiEndpoints.treasuryFundStaging.upstream,
      request: {
        operation: "treasury.fund-staging",
        appRoute: crossmintApiEndpoints.treasuryFundStaging.path,
        targetReserveUsdxm: STAGING_TREASURY_RESERVE_USDXM,
        currentBalanceUsdxm: treasuryBalance,
        amountUsdxm: topUpUsd,
        maxPerCallUsdxm: 100,
        expectedApiCalls: Math.ceil(topUpUsd / 100),
        treasury: treasuryConfig.address,
        simulated: TREASURY_WALLET_DEMO_MODE,
      },
      status: "pending",
    });
    appendHuman(
      TREASURY_WALLET_DEMO_MODE
        ? "Treasury reserve prepared (simulated)"
        : "Treasury sandbox funding initiated",
      TREASURY_WALLET_DEMO_MODE
        ? `$${STAGING_TREASURY_RESERVE_USDXM} USDXM reserve shown for demo — no Crossmint stagingFund calls.`
        : treasuryBalance && treasuryBalance > 0
          ? `Topping up ${treasuryConfig.alias} from $${treasuryBalance.toFixed(2)} to $${STAGING_TREASURY_RESERVE_USDXM} USDXM (sandbox stablecoin, 1:1 with USDC in production).`
          : `Adding $${STAGING_TREASURY_RESERVE_USDXM} USDXM to ${treasuryConfig.alias} — sandbox stablecoin equivalent to USDC in production.`,
      "pending",
    );

    try {
      const result = await fundTreasuryStaging();
      if (
        typeof result.balanceAfter === "number" &&
        result.balanceAfter >= STAGING_TREASURY_RESERVE_USDXM
      ) {
        treasuryReserveMetRef.current = true;
      }

      const fundedAmount = result.fundAmount ?? 0;
      const calls = result.calls ?? [];

      if (result.funded && fundedAmount > 0) {
        appendHuman(
          TREASURY_WALLET_DEMO_MODE
            ? "Treasury reserve ready (simulated)"
            : "Treasury sandbox funding completed",
          TREASURY_WALLET_DEMO_MODE
            ? `$${STAGING_TREASURY_RESERVE_USDXM} USDXM demo balance — no live Crossmint funding.`
            : `$${fundedAmount} USDXM added via ${calls.length} Crossmint stagingFund call${calls.length === 1 ? "" : "s"} ($100 max each). Treasury balance is now $${result.balanceAfter?.toFixed(2) ?? STAGING_TREASURY_RESERVE_USDXM}.`,
          "success",
        );

        for (const call of calls) {
          appendCrossmint(
            TREASURY_WALLET_DEMO_MODE
              ? `Simulated stagingFund call ${call.callIndex}/${calls.length}`
              : `Crossmint stagingFund call ${call.callIndex}/${calls.length}`,
            {
              message: TREASURY_WALLET_DEMO_MODE
                ? `Demo: $${call.amountUsdxm} USDXM (no API call).`
                : `Funded $${call.amountUsdxm} USDXM via Crossmint wallets API.`,
              method: "POST",
              endpoint: call.endpoint,
              request: {
                operation: "wallet.stagingFund",
                appRoute: crossmintApiEndpoints.treasuryFundStaging.path,
                wallet: treasuryConfig.address,
                amountUsdxm: call.amountUsdxm,
                token: "usdxm",
                chain: crossmintConfig.chain,
                callIndex: call.callIndex,
                totalCalls: calls.length,
                simulated: TREASURY_WALLET_DEMO_MODE,
              },
              response: {
                crossmint: call.crossmintResponse,
              },
              status: "success",
            },
          );
        }

        appendCrossmint("Treasury staging fund summary", {
          message: getStablecoinEnvironmentNote(crossmintConfig.chain),
          method: crossmintApiEndpoints.treasuryFundStaging.method,
          endpoint: crossmintApiEndpoints.treasuryFundStaging.upstream,
          response: {
            fundAmount: fundedAmount,
            balanceBefore: result.balanceBefore,
            balanceAfter: result.balanceAfter,
            callCount: calls.length,
          },
          status: "success",
        });
      } else if (
        typeof result.balanceAfter === "number" &&
        result.balanceAfter >= STAGING_TREASURY_RESERVE_USDXM
      ) {
        treasuryReserveMetRef.current = true;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Treasury funding failed.";
      appendHuman("Treasury funding failed", message, "warning");
      appendCrossmint("Crossmint stagingFund failed", {
        message,
        method: crossmintApiEndpoints.treasuryFundStaging.method,
        endpoint: crossmintApiEndpoints.treasuryFundStaging.upstream,
        status: "warning",
      });
    } finally {
      setIsFundingTreasury(false);
      stagingFundInFlightRef.current = false;
    }
  }, [
    appendCrossmint,
    appendHuman,
    fundTreasuryStaging,
    treasuryBalance,
  ]);

  useEffect(() => {
    if (
      treasuryBalance !== null &&
      treasuryBalance >= STAGING_TREASURY_RESERVE_USDXM
    ) {
      treasuryReserveMetRef.current = true;
    }
  }, [treasuryBalance]);

  useEffect(() => {
    if (treasuryReserveMetRef.current) return;
    if (treasuryStatus !== "ready") return;
    if (!isStagingChain(crossmintConfig.chain)) return;
    if (treasuryBalance === null) return;
    if (treasuryBalance >= STAGING_TREASURY_RESERVE_USDXM) return;
    if (stagingFundInFlightRef.current) return;
    if (!fundTreasuryStaging) return;

    stagingFundInFlightRef.current = true;
    void runStagingTreasuryFund();
  }, [
    fundTreasuryStaging,
    runStagingTreasuryFund,
    treasuryBalance,
    treasuryStatus,
    viewStep,
  ]);

  useEffect(() => {
    if (status !== "vendors_compared" || orderSummary) return;
    setOrderSummary({
      vendor: SELECTED_VENDOR.vendor,
      unitPrice: SELECTED_VENDOR.price,
      tax: SELECTED_VENDOR.taxEstimate,
      shipping: SELECTED_VENDOR.shippingCost,
      total: SELECTED_VENDOR.totalLandedCost,
      deliveryEstimate: SELECTED_VENDOR.deliveryEstimate,
      vendorStatus: SELECTED_VENDOR.vendorStatus,
    });
  }, [status, orderSummary]);

  const submitRequest = useCallback(() => {
    setStatus("submitted");
    setViewStep(1);
    setAuditEvents((current) => appendAuditEvent(current, "request_created"));
    appendHuman(
      "Procurement request submitted",
      `${request.employeeName} submitted ${request.productSku} for $${request.estimatedRetailPrice.toFixed(2)} · Office Equipment`,
      "success",
    );
  }, [appendHuman, request]);

  const runPolicyCheck = useCallback(() => {
    setStatus("policy_checked");
    setViewStep(2);
    setAuditEvents((current) => {
      let next = appendAuditEvent(current, "policy_checked");
      if (policyResult === "approval_required") {
        next = appendAuditEvent(next, "approval_required");
      }
      return next;
    });
    appendHuman(
      "Procurement policy triggered manager approval",
      `$${request.estimatedRetailPrice.toFixed(2)} exceeds the $${LILYS_POLICY.employeeApprovalLimitUsd} employee approval limit.`,
      "warning",
    );
  }, [appendHuman, policyResult, request.estimatedRetailPrice]);

  const approveRequest = useCallback(() => {
    setStatus("approved");
    setViewStep(3);
    setAuditEvents((current) => appendAuditEvent(current, "approval_granted"));
    appendHuman(
      "Delegated authority granted for this transaction",
      "One-time disbursement scope issued to the AI procurement agent for vendor sourcing and payment recommendation.",
      "success",
    );
  }, [appendHuman]);

  const compareVendors = useCallback(async () => {
    if (comparisonRunningRef.current) return;
    comparisonRunningRef.current = true;
    setVendorComparisonPhase("running");
    setViewStep(3);
    setVendorQuotes([]);
    setSelectedVendor(null);
    setAgentStepIndex(0);

    appendHuman(
      "AI procurement agent started vendor sourcing",
      "Evaluating approved punchout suppliers for lowest total landed cost and relationship fit.",
      "pending",
    );

    for (let index = 0; index < VENDOR_QUOTES.length; index += 1) {
      setAgentStepIndex(index);
      await delay(650);
      setVendorQuotes((current) => [...current, VENDOR_QUOTES[index]!]);
    }

    setAgentStepIndex(VENDOR_SOURCING_STEPS.length - 1);
    await delay(900);

    const finalizedQuotes = VENDOR_QUOTES.map((quote) => ({
      ...quote,
      selected: quote.vendor === SELECTED_VENDOR.vendor,
    }));

    setVendorQuotes(finalizedQuotes);
    setSelectedVendor(SELECTED_VENDOR);
    setVendorComparisonPhase("complete");
    setStatus("vendors_compared");
    setAuditEvents((current) => {
      let next = appendAuditEvent(current, "vendor_comparison_complete");
      next = appendAuditEvent(next, "vendor_selected");
      return next;
    });
    appendHuman(
      "Agent recommendation: SHI",
      `Selected based on contract pricing, free shipping, and preferred supplier relationship — $${SELECTED_VENDOR.totalLandedCost.toFixed(2)} total landed cost.`,
      "success",
    );
    comparisonRunningRef.current = false;
  }, [appendHuman]);

  useEffect(() => {
    if (viewStep !== 3) return;
    if (status !== "approved") return;
    if (vendorComparisonPhase !== "idle") return;
    if (comparisonRunningRef.current) return;
    void compareVendors();
  }, [viewStep, status, vendorComparisonPhase, compareVendors]);

  const executePayment = useCallback(async () => {
    if (!executeTreasuryPayment) {
      setPaymentError(
        "Corporate treasury is not ready. Wait for wallet connection, then try again.",
      );
      return;
    }

    setIsExecutingPayment(true);
    setPaymentError(null);

    const paymentAmount = SELECTED_VENDOR.totalLandedCost;
    const amount = paymentAmount.toFixed(2);
    const paymentToken = getPaymentToken(crossmintConfig.chain);
    const tokenLabel = paymentToken.toUpperCase();

    appendCrossmint("Treasury vendor payout requested", {
      message: TREASURY_WALLET_DEMO_MODE
        ? `Simulated ${tokenLabel} payout from ${treasuryConfig.alias} to SHI (${SHI_VENDOR_TREASURY_ADDRESS}).`
        : `Server treasury ${tokenLabel} payout from ${treasuryConfig.alias} to SHI (${SHI_VENDOR_TREASURY_ADDRESS}).`,
      method: crossmintApiEndpoints.treasuryExecutePayment.method,
      endpoint: crossmintApiEndpoints.treasuryExecutePayment.upstream,
      request: {
        operation: "treasury.execute-payment",
        appRoute: crossmintApiEndpoints.treasuryExecutePayment.path,
        treasury: treasuryConfig.address,
        alias: treasuryConfig.alias,
        recipient: SHI_VENDOR_TREASURY_ADDRESS,
        amount: paymentAmount,
        token: paymentToken,
        simulated: TREASURY_WALLET_DEMO_MODE,
      },
      status: "pending",
    });

    try {
      const result = await executeTreasuryPayment(paymentAmount);
      const explorerLink = result.simulated
        ? undefined
        : (result.explorerLink ??
          getTransactionExplorerLink(crossmintConfig.chain, result.hash));

      setStatus("payment_executed");
      setOrderSummary({
        vendor: SELECTED_VENDOR.vendor,
        unitPrice: SELECTED_VENDOR.price,
        tax: SELECTED_VENDOR.taxEstimate,
        shipping: SELECTED_VENDOR.shippingCost,
        total: SELECTED_VENDOR.totalLandedCost,
        deliveryEstimate: SELECTED_VENDOR.deliveryEstimate,
        vendorStatus: SELECTED_VENDOR.vendorStatus,
        transactionHash: result.hash,
        explorerLink,
      });
      setAuditEvents((current) => {
        let next = appendAuditEvent(current, "payment_ready");
        next = appendAuditEvent(next, "payment_executed");
        return next;
      });
      appendHuman(
        TREASURY_WALLET_DEMO_MODE
          ? "Payment simulated to SHI"
          : "Payment executed to SHI",
        TREASURY_WALLET_DEMO_MODE
          ? `${amount} ${tokenLabel} vendor payout simulated from ${treasuryConfig.alias}. No on-chain activity in demo mode.`
          : `${amount} ${tokenLabel} paid out from ${treasuryConfig.alias} to external Phantom wallet on ${crossmintConfig.chain}.`,
        "success",
      );
      appendCrossmint(
        TREASURY_WALLET_DEMO_MODE
          ? `${tokenLabel} vendor payout simulated`
          : `${tokenLabel} vendor payout confirmed`,
        {
          message: TREASURY_WALLET_DEMO_MODE
            ? "Demo mode — no Crossmint wallets API call or on-chain broadcast."
            : "On-chain vendor payout submitted via company treasury server API.",
          method: crossmintApiEndpoints.treasuryExecutePayment.method,
          endpoint: crossmintApiEndpoints.treasuryExecutePayment.upstream,
          response: {
            hash: result.hash,
            explorerLink,
            amount,
            token: paymentToken,
            recipient: SHI_VENDOR_TREASURY_ADDRESS,
            treasuryAddress: treasuryConfig.address,
            simulated: result.simulated ?? TREASURY_WALLET_DEMO_MODE,
          },
          status: "success",
        },
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to execute payment. Check treasury configuration and try again.";
      setPaymentError(message);
      appendHuman("Payment execution failed", message, "warning");
      appendCrossmint("Crossmint vendor payout failed", {
        message,
        method: crossmintApiEndpoints.treasuryExecutePayment.method,
        endpoint: crossmintApiEndpoints.treasuryExecutePayment.upstream,
        status: "warning",
      });
    } finally {
      setIsExecutingPayment(false);
    }
  }, [
    appendCrossmint,
    appendHuman,
    executeTreasuryPayment,
  ]);

  const runAction = useCallback(
    (action: WorkflowAction) => {
      switch (action) {
        case "submit_request":
          submitRequest();
          break;
        case "run_policy_check":
          runPolicyCheck();
          break;
        case "approve_request":
          approveRequest();
          break;
        case "compare_vendors":
          void compareVendors();
          break;
        case "execute_payment":
          void executePayment();
          break;
      }
    },
    [
      submitRequest,
      runPolicyCheck,
      approveRequest,
      compareVendors,
      executePayment,
    ],
  );

  const nextAction = nextActionForStatus(status);
  const isComplete = status === "payment_executed";

  const canRunAction = (action: WorkflowAction): boolean => {
    if (isComplete) return false;
    switch (action) {
      case "submit_request":
        return status === "draft";
      case "run_policy_check":
        return status === "submitted";
      case "approve_request":
        return status === "policy_checked" && policyResult === "approval_required";
      case "compare_vendors":
        return false;
      case "execute_payment":
        return (
          status === "vendors_compared" &&
          viewStep === 4 &&
          treasuryStatus === "ready" &&
          !isExecutingPayment &&
          !isFundingTreasury &&
          Boolean(executeTreasuryPayment)
        );
      default:
        return false;
    }
  };

  const goToStep = useCallback(
    (step: WizardStep) => {
      if (step <= maxStep) setViewStep(step);
    },
    [maxStep],
  );

  return {
    request,
    policyResult,
    status,
    viewStep,
    maxStep,
    auditEvents,
    activityTrace,
    vendorQuotes,
    selectedVendor,
    orderSummary,
    vendorComparisonPhase,
    agentStepIndex,
    agentSteps: VENDOR_SOURCING_STEPS,
    isExecutingPayment,
    isFundingTreasury,
    paymentError,
    nextAction,
    isComplete,
    canRunAction,
    runAction,
    goToStep,
  };
}
