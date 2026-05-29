"use client";

import { useCallback } from "react";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-ui";

import { crossmintConfig } from "@/lib/crossmint/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

async function copyToClipboard(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function WalletPanel() {
  const { user, logout, status: authStatus } = useCrossmintAuth();
  const { wallet, status: walletStatus } = useWallet();

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const handleCopyAddress = useCallback(async () => {
    if (!wallet?.address) return;
    await copyToClipboard(wallet.address);
  }, [wallet?.address]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Payment Infrastructure
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-50">
            Corporate Treasury Account
          </h2>
          <p className="mt-1 text-sm text-slate-400">{user?.email}</p>
        </div>
        <Badge variant="success">Provisioned</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {walletStatus === "in-progress" ? (
          <div className="flex justify-center py-8">
            <Spinner label="Provisioning payment account…" />
          </div>
        ) : null}

        {walletStatus === "error" ? (
          <Alert variant="error" title="Payment account unavailable">
            Unable to provision the embedded payment account. End your session and
            authenticate again.
          </Alert>
        ) : null}

        {walletStatus === "loaded" && wallet ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Funding account address
              </p>
              <p className="mt-2 break-all font-mono text-sm text-emerald-300">
                {wallet.address}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {truncateAddress(wallet.address)} · {crossmintConfig.chain} ·
                embedded payment rail
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => void handleCopyAddress()}>
                Copy account ID
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleLogout()}
                disabled={authStatus === "in-progress"}
              >
                End session
              </Button>
            </div>
          </div>
        ) : null}

        {walletStatus === "not-loaded" && authStatus === "logged-in" ? (
          <Alert variant="info">
            Payment infrastructure is being provisioned. This typically completes
            within seconds of operator authentication.
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
