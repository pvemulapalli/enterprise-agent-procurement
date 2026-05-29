"use client";

import type { ReactNode } from "react";

import {
  LILYS_POLICY,
  MAGIC_KEYBOARD_PRODUCT,
} from "@/lib/procurement/lilys-boutique";
import type { WorkflowAction } from "@/lib/procurement/lilys-boutique";
import type {
  LilysProcurementRequest,
  OrderSummary,
  PolicyCheckResult,
  VendorComparisonPhase,
  VendorQuote,
} from "@/lib/procurement/types";
import type { WizardStep } from "@/lib/procurement/wizard";
import { crossmintConfig } from "@/lib/crossmint/config";
import { crossmintApiEndpoints } from "@/lib/crossmint/endpoints";
import { getPaymentToken, getStablecoinEnvironmentNote } from "@/lib/crossmint/payment";
import {
  TREASURY_WALLET_DEMO_DISCLAIMER,
  TREASURY_WALLET_DEMO_MODE,
  TREASURY_WALLET_DOCS_URL,
} from "@/lib/crossmint/treasury-demo";
import { LilysBoutiqueLogo } from "@/components/brand/lilys-boutique-logo";
import { Button } from "@/components/ui/button";

import { WizardProgress } from "./wizard-progress";

type CommerceWizardProps = {
  request: LilysProcurementRequest;
  policyResult: PolicyCheckResult;
  viewStep: WizardStep;
  maxStep: WizardStep;
  vendorQuotes: VendorQuote[];
  selectedVendor: VendorQuote | null;
  orderSummary: OrderSummary | null;
  vendorComparisonPhase: VendorComparisonPhase;
  agentStepIndex: number;
  agentSteps: readonly string[];
  isExecutingPayment: boolean;
  isFundingTreasury: boolean;
  paymentError: string | null;
  walletAddress?: string;
  walletStatus: "not-loaded" | "in-progress" | "loaded" | "error";
  treasuryAlias?: string;
  treasuryBalance?: string | null;
  treasuryError?: string | null;
  nextAction: WorkflowAction | null;
  isComplete: boolean;
  canRunAction: (action: WorkflowAction) => boolean;
  onAction: (action: WorkflowAction) => void;
  onStepClick: (step: WizardStep) => void;
};

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function CommerceWizard(props: CommerceWizardProps) {
  const {
    request,
    policyResult,
    viewStep,
    maxStep,
    vendorQuotes,
    selectedVendor,
    orderSummary,
    vendorComparisonPhase,
    agentStepIndex,
    agentSteps,
    isExecutingPayment,
    isFundingTreasury,
    paymentError,
    walletAddress,
    walletStatus,
    treasuryAlias,
    treasuryBalance,
    treasuryError,
    nextAction,
    isComplete,
    canRunAction,
    onAction,
    onStepClick,
  } = props;

  const primaryAction = nextAction;
  const primaryLabel =
    primaryAction === "submit_request"
      ? "Submit request"
      : primaryAction === "run_policy_check"
        ? "Evaluate policy"
        : primaryAction === "approve_request"
          ? "Grant approval"
            : primaryAction === "compare_vendors"
            ? "Compare vendors"
            : primaryAction === "execute_payment"
              ? "Execute payment"
              : null;

  return (
    <div className="flex h-full flex-col bg-[#f5f5f7] text-slate-900">
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-8 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <LilysBoutiqueLogo variant="light" size="lg" />
            <div className="hidden h-10 w-px bg-slate-200 sm:block" />
            <h1 className="hidden text-lg font-semibold tracking-tight text-slate-700 sm:block">
              Intranet Procurement Portal
            </h1>
          </div>
          <div className="shrink-0 text-right text-xs text-slate-500">
            <p className="font-medium text-slate-800">{request.employeeName}</p>
            <p className="text-slate-500">{request.employeeEmail}</p>
            <p className="mt-0.5">
              {request.department} · Limit {formatUsd(request.employeeApprovalLimit)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-600 sm:hidden">
          Intranet Procurement Portal
        </p>
      </header>

      <WizardProgress
        currentStep={viewStep}
        maxStep={maxStep}
        onStepClick={onStepClick}
      />

      <div className="flex min-h-0 flex-1 flex-col px-8 pb-6 pt-4">
        <div className="flex min-h-0 flex-1 items-stretch">
          {viewStep === 0 ? (
            <StepProductRequest request={request} />
          ) : null}
          {viewStep === 1 ? (
            <StepPolicy
              request={request}
              policyResult={policyResult}
              policyChecked={maxStep >= 2}
            />
          ) : null}
          {viewStep === 2 ? (
            <StepApproval approved={maxStep >= 3} request={request} />
          ) : null}
          {viewStep === 3 ? (
            <StepVendors
              quotes={vendorQuotes}
              selected={selectedVendor}
              phase={vendorComparisonPhase}
              agentStepIndex={agentStepIndex}
              agentSteps={agentSteps}
            />
          ) : null}
          {viewStep === 4 ? (
            <StepPayment
              orderSummary={orderSummary}
              walletAddress={walletAddress}
              walletStatus={walletStatus}
              treasuryAlias={treasuryAlias}
              treasuryBalance={treasuryBalance}
              treasuryError={treasuryError}
              isComplete={isComplete}
              selectedVendor={selectedVendor}
              isExecutingPayment={isExecutingPayment}
              isFundingTreasury={isFundingTreasury}
              paymentError={paymentError}
            />
          ) : null}
        </div>

        <footer className="mt-4 flex shrink-0 items-center justify-between border-t border-slate-200/80 pt-4">
          <button
            type="button"
            disabled={viewStep === 0}
            onClick={() => onStepClick((viewStep - 1) as WizardStep)}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 disabled:invisible"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            {isComplete ? (
              <span className="text-sm font-medium text-emerald-700">
                Payment simulated
              </span>
            ) : isFundingTreasury ? (
              <span className="text-sm font-medium text-slate-600">
                Preparing treasury (demo)…
              </span>
            ) : isExecutingPayment ? (
              <span className="text-sm font-medium text-slate-600">
                Simulating payment…
              </span>
            ) : viewStep === 3 && vendorComparisonPhase === "running" ? (
              <span className="text-sm font-medium text-slate-600">
                Agent sourcing vendors…
              </span>
            ) : primaryAction && primaryLabel && viewStep === maxStep ? (
              <Button
                onClick={() => onAction(primaryAction)}
                disabled={!canRunAction(primaryAction)}
                className="!bg-slate-900 !text-white hover:!bg-slate-800 disabled:!opacity-50"
              >
                {primaryLabel}
              </Button>
            ) : viewStep < maxStep ? (
              <Button
                variant="secondary"
                onClick={() => onStepClick((viewStep + 1) as WizardStep)}
                className="!border-slate-300 !bg-white !text-slate-800"
              >
                Continue →
              </Button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}

function StepProductRequest({ request }: { request: LilysProcurementRequest }) {
  return (
    <div className="grid w-full grid-cols-2 gap-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/60">
      <div className="flex items-center justify-center rounded-xl bg-[#fbfbfd] p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MAGIC_KEYBOARD_PRODUCT.imageUrl}
          alt={MAGIC_KEYBOARD_PRODUCT.shortName}
          className="h-auto max-h-[240px] w-full max-w-[360px] object-contain"
        />
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {request.category}
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-slate-900">
          {MAGIC_KEYBOARD_PRODUCT.shortName}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{request.productSku}</p>
        <p className="mt-4 text-3xl font-semibold tabular-nums text-slate-900">
          {formatUsd(request.estimatedRetailPrice)}
        </p>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Quantity</dt>
            <dd className="font-medium">1</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Business justification</dt>
            <dd className="max-w-[220px] text-right font-medium">
              {request.businessReason}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function StepPolicy({
  request,
  policyResult,
  policyChecked,
}: {
  request: LilysProcurementRequest;
  policyResult: PolicyCheckResult;
  policyChecked: boolean;
}) {
  const exceeded =
    request.estimatedRetailPrice > request.employeeApprovalLimit;

  return (
    <div className="flex w-full flex-col justify-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/60">
      <h2 className="text-xl font-semibold text-slate-900">Policy evaluation</h2>
      <p className="mt-1 text-sm text-slate-500">
        Automated spend guardrails for {request.employeeName}
      </p>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <PolicyCard
          label="Request amount"
          value={formatUsd(request.estimatedRetailPrice)}
          tone="neutral"
        />
        <PolicyCard
          label="Employee limit"
          value={formatUsd(request.employeeApprovalLimit)}
          tone="neutral"
        />
        <PolicyCard
          label="Status"
          value={
            policyChecked
              ? policyResult === "approval_required"
                ? "Approval required"
                : "Within limit"
              : "Pending"
          }
          tone={exceeded && policyChecked ? "warning" : "neutral"}
        />
      </div>

      {exceeded ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">Approval threshold exceeded</p>
          <p className="mt-1 text-sm text-amber-800/80">
            This request exceeds the ${request.employeeApprovalLimit} employee
            approval limit and must route to a procurement operator before
            vendor selection or payment.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PolicyCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "warning" | "success";
}) {
  const tones = {
    neutral: "border-slate-100 bg-slate-50",
    warning: "border-amber-200 bg-amber-50",
    success: "border-emerald-200 bg-emerald-50",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StepApproval({
  approved,
  request,
}: {
  approved: boolean;
  request: LilysProcurementRequest;
}) {
  return (
    <div className="flex w-full flex-col justify-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/60">
      <h2 className="text-xl font-semibold text-slate-900">Approval orchestration</h2>
      <p className="mt-1 text-sm text-slate-500">Human-in-the-loop operator confirmation</p>

      <div className="mt-8 space-y-4">
        <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
            AS
          </div>
          <div>
            <p className="font-medium text-slate-900">{request.employeeName}</p>
            <p className="text-sm text-slate-500">Requesting · {formatUsd(request.estimatedRetailPrice)}</p>
          </div>
        </div>

        {approved ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-sm font-semibold text-emerald-900">
              Delegated authority granted
            </p>
            <p className="mt-1 text-sm text-emerald-800/80">
              Scoped approval issued for this transaction only. The AI procurement
              agent may proceed to vendor comparison and payment preparation.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-sm text-slate-600">
              Awaiting operator approval to release agent orchestration for vendor
              sourcing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepVendors({
  quotes,
  selected,
  phase,
  agentStepIndex,
  agentSteps,
}: {
  quotes: VendorQuote[];
  selected: VendorQuote | null;
  phase: VendorComparisonPhase;
  agentStepIndex: number;
  agentSteps: readonly string[];
}) {
  if (phase === "idle" && quotes.length === 0) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/60">
        <p className="text-sm text-slate-500">
          Run vendor comparison to source pricing across approved suppliers.
        </p>
      </div>
    );
  }

  const isRunning = phase === "running";
  const isComplete = phase === "complete";

  return (
    <div className="flex w-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Vendor comparison</h2>
          <p className="text-sm text-slate-500">
            {isRunning
              ? "AI agent sourcing quotes from approved punchout vendors"
              : "AI agent completed vendor evaluation"}
          </p>
        </div>
        {isRunning ? (
          <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
            Agent working
          </span>
        ) : null}
        {isComplete && selected ? (
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
            Decision: {selected.vendor}
          </span>
        ) : null}
      </div>

      {isRunning ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Agent activity
          </p>
          <ul className="mt-2 space-y-1.5">
            {agentSteps.map((step, index) => {
              const isDone = index < agentStepIndex;
              const isActive = index === agentStepIndex;
              return (
                <li
                  key={step}
                  className={`flex items-center gap-2 text-sm ${
                    isDone
                      ? "text-emerald-700"
                      : isActive
                        ? "font-medium text-slate-800"
                        : "text-slate-400"
                  }`}
                >
                  <span className="w-4 text-center text-xs">
                    {isDone ? "✓" : isActive ? "…" : "·"}
                  </span>
                  {step}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {quotes.length > 0 ? (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-3 pr-3 font-medium">Vendor</th>
                <th className="pb-3 pr-3 font-medium">Price</th>
                <th className="pb-3 pr-3 font-medium">Tax</th>
                <th className="pb-3 pr-3 font-medium">Ship</th>
                <th className="pb-3 pr-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.vendor}
                  className={`border-b border-slate-50 transition-colors duration-500 ${
                    quote.selected && isComplete
                      ? "bg-emerald-50/80 ring-1 ring-emerald-200/60"
                      : isRunning
                        ? "opacity-100"
                        : ""
                  }`}
                >
                  <td className="py-3 pr-3">
                    <span className="font-medium text-slate-900">{quote.vendor}</span>
                    {quote.selected && isComplete ? (
                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Selected
                      </span>
                    ) : null}
                    <p className="text-[11px] text-slate-400">{quote.vendorStatus}</p>
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-slate-600">
                    {formatUsd(quote.price)}
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-slate-600">
                    {formatUsd(quote.taxEstimate)}
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-slate-600">
                    {formatUsd(quote.shippingCost)}
                  </td>
                  <td className="py-3 pr-3 tabular-nums font-semibold text-slate-900">
                    {formatUsd(quote.totalLandedCost)}
                  </td>
                  <td className="py-3 text-slate-600">{quote.deliveryEstimate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {isComplete && selected?.selectionReason ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Agent recommendation
          </p>
          <p className="mt-1 text-sm text-emerald-900/90">{selected.selectionReason}</p>
        </div>
      ) : null}
    </div>
  );
}

function StepPayment({
  orderSummary,
  walletAddress,
  walletStatus,
  treasuryAlias,
  treasuryBalance,
  treasuryError,
  isComplete,
  selectedVendor,
  isExecutingPayment,
  isFundingTreasury,
  paymentError,
}: {
  orderSummary: OrderSummary | null;
  walletAddress?: string;
  walletStatus: "not-loaded" | "in-progress" | "loaded" | "error";
  treasuryAlias?: string;
  treasuryBalance?: string | null;
  treasuryError?: string | null;
  isComplete: boolean;
  selectedVendor: VendorQuote | null;
  isExecutingPayment: boolean;
  isFundingTreasury: boolean;
  paymentError: string | null;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
        {orderSummary ? (
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Supplier" value={orderSummary.vendor} />
            <Row label="Subtotal" value={formatUsd(orderSummary.unitPrice)} />
            <Row label="Tax" value={formatUsd(orderSummary.tax)} />
            <Row label="Shipping" value={formatUsd(orderSummary.shipping)} />
            <Row label="Total due" value={formatUsd(orderSummary.total)} bold />
            <Row label="Delivery" value={orderSummary.deliveryEstimate} />
            {orderSummary.transactionHash ? (
              <Row
                label="Transaction"
                value={
                  orderSummary.explorerLink ? (
                    <a
                      href={orderSummary.explorerLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-emerald-700 underline-offset-2 hover:underline"
                    >
                      {orderSummary.transactionHash.slice(0, 10)}…
                    </a>
                  ) : TREASURY_WALLET_DEMO_MODE ? (
                    <span className="font-mono text-xs text-slate-600">
                      {orderSummary.transactionHash.slice(0, 10)}… (simulated)
                    </span>
                  ) : (
                    orderSummary.transactionHash.slice(0, 10) + "…"
                  )
                }
              />
            ) : null}
          </dl>
        ) : selectedVendor ? (
          <p className="mt-4 text-sm text-slate-500">
            {selectedVendor.vendor} · {formatUsd(selectedVendor.totalLandedCost)} estimated
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Complete vendor selection first.</p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-slate-400">
          Payment rail: {LILYS_POLICY.paymentRail}
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
          Crossmint treasury wallet (demo)
        </p>
        <h2 className="mt-2 text-lg font-semibold">
          {treasuryAlias ?? "Lily's Boutique Treasury Wallet"}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Company-owned treasury — simulated for this demo until Crossmint enables
          Treasury Wallets on your project.
        </p>

        {TREASURY_WALLET_DEMO_MODE ? (
          <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3">
            <p className="text-xs font-medium text-sky-200">Enterprise feature — demo mode</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-sky-100/80">
              {TREASURY_WALLET_DEMO_DISCLAIMER}{" "}
              <a
                href={TREASURY_WALLET_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Treasury Wallets guide
              </a>
            </p>
          </div>
        ) : null}

        {walletAddress ? (
          <div className="mt-4 space-y-3">
            <p className="break-all font-mono text-xs leading-relaxed text-emerald-300">
              {walletAddress}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-emerald-300">
                {crossmintConfig.chain}
              </span>
              <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-slate-300">
                {getPaymentToken(crossmintConfig.chain).toUpperCase()} stablecoin rail
              </span>
              {walletStatus === "loaded" ? (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-emerald-300">
                  Ready
                </span>
              ) : walletStatus === "error" ? (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-amber-200">
                  Unavailable
                </span>
              ) : (
                <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-slate-400">
                  Loading…
                </span>
              )}
            </div>
            {treasuryBalance ? (
              <p className="text-sm text-slate-300">
                Balance remaining:{" "}
                <span className="font-medium text-emerald-300">{treasuryBalance}</span>
              </p>
            ) : null}
            <p className="text-[11px] leading-relaxed text-slate-500">
              {getStablecoinEnvironmentNote(crossmintConfig.chain)}
            </p>
          </div>
        ) : null}

        {treasuryError ? (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-medium text-amber-200">Treasury unavailable</p>
            <p className="mt-1 text-xs text-amber-200/80">{treasuryError}</p>
          </div>
        ) : null}

        {paymentError ? (
          <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-medium text-amber-200">Payment failed</p>
            <p className="mt-1 text-xs text-amber-200/80">{paymentError}</p>
          </div>
        ) : null}

        {!isComplete ? (
          <p className="mt-5 text-xs text-slate-500">
            Execute payment to simulate a vendor payout from the company treasury.
            No Crossmint API call or on-chain transfer is made in demo mode.
          </p>
        ) : null}

        {isFundingTreasury ? (
          <div className="mt-5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3">
            <p className="text-sm font-medium text-violet-200">
              Preparing treasury balance (simulated)…
            </p>
            <p className="mt-1 text-xs text-violet-200/70">
              Demo mode — staging reserve shown as $200 USDXM without calling Crossmint.
            </p>
          </div>
        ) : null}

        {isExecutingPayment && !isFundingTreasury ? (
          <div className="mt-5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
            <p className="text-sm font-medium text-cyan-200">
              Simulating {getPaymentToken(crossmintConfig.chain).toUpperCase()} vendor
              payout…
            </p>
            <p className="mt-1 text-xs text-cyan-200/70">
              Generating a demo transaction reference — no broadcast to Base Sepolia.
            </p>
          </div>
        ) : null}

        {isComplete ? (
          <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-medium text-emerald-200">
              Payment simulated successfully
            </p>
            <p className="mt-1 text-xs text-emerald-200/70">
              Demo complete. With Treasury Wallets enabled, this step would sign and
              broadcast a real vendor payout via Crossmint&apos;s server API.
              {orderSummary?.explorerLink ? (
                <>
                  {" "}
                  <a
                    href={orderSummary.explorerLink}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    View on explorer
                  </a>
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string | ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className={bold ? "font-semibold text-slate-900" : "text-slate-700"}>
        {value}
      </dd>
    </div>
  );
}
