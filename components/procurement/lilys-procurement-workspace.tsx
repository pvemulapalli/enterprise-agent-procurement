"use client";

import { useState } from "react";

import { useCorporateTreasury } from "@/hooks/use-corporate-treasury";
import { useLilysProcurementWorkflow } from "@/hooks/use-lilys-procurement-workflow";

import { CommerceWizard } from "./commerce-wizard";
import { InfrastructureTrace } from "./infrastructure-trace";

function mapTreasuryStatus(
  status: "loading" | "ready" | "error",
): "not-loaded" | "in-progress" | "loaded" | "error" {
  switch (status) {
    case "loading":
      return "in-progress";
    case "ready":
      return "loaded";
    case "error":
      return "error";
  }
}

export function LilysProcurementWorkspace() {
  const [treasuryRefreshKey, setTreasuryRefreshKey] = useState(0);
  const treasury = useCorporateTreasury(treasuryRefreshKey);
  const workflow = useLilysProcurementWorkflow({
    executeTreasuryPayment: treasury.executePayment,
    fundTreasuryStaging: treasury.fundStagingIfNeeded,
    treasuryStatus: treasury.status,
    treasuryBalance: treasury.balance,
    onTreasuryRefresh: () => setTreasuryRefreshKey((current) => current + 1),
  });
  const walletStatus = mapTreasuryStatus(treasury.status);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
      <div className="h-full w-[65%] shrink-0">
        <CommerceWizard
          request={workflow.request}
          policyResult={workflow.policyResult}
          viewStep={workflow.viewStep}
          maxStep={workflow.maxStep}
          vendorQuotes={workflow.vendorQuotes}
          selectedVendor={workflow.selectedVendor}
          orderSummary={workflow.orderSummary}
          vendorComparisonPhase={workflow.vendorComparisonPhase}
          agentStepIndex={workflow.agentStepIndex}
          agentSteps={workflow.agentSteps}
          isExecutingPayment={workflow.isExecutingPayment}
          isFundingTreasury={workflow.isFundingTreasury}
          paymentError={workflow.paymentError}
          walletAddress={treasury.address}
          walletStatus={walletStatus}
          treasuryAlias={treasury.alias}
          treasuryBalance={treasury.formattedBalance}
          treasuryError={treasury.error}
          nextAction={workflow.nextAction}
          isComplete={workflow.isComplete}
          canRunAction={workflow.canRunAction}
          onAction={workflow.runAction}
          onStepClick={workflow.goToStep}
        />
      </div>
      <div className="h-full w-[35%] shrink-0">
        <InfrastructureTrace
          activityTrace={workflow.activityTrace}
          auditEvents={workflow.auditEvents}
          walletAddress={treasury.address}
          walletStatus={walletStatus}
          treasuryAlias={treasury.alias}
          treasuryDisplayName={treasury.displayName}
          stablecoinBalance={treasury.formattedBalance}
        />
      </div>
    </div>
  );
}
