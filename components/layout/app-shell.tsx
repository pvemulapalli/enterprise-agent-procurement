"use client";

import { useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

import { LilysBoutiqueLogo } from "@/components/brand/lilys-boutique-logo";
import { LoginWorkspace } from "@/components/auth/login-workspace";
import { AuthStatus } from "@/components/auth/auth-status";
import { LilysProcurementWorkspace } from "@/components/procurement/lilys-procurement-workspace";

export function AppHeader() {
  return (
    <header className="shrink-0 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-5">
        <LilysBoutiqueLogo variant="dark" size="md" />
        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
          Crossmint payment rail · Base Sepolia
        </span>
      </div>
    </header>
  );
}

export function AppShell() {
  const { status, user } = useCrossmintAuth();
  const isAuthenticated = status === "logged-in" && user != null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950">
      {isAuthenticated ? <AppHeader /> : null}

      <AuthStatus>
        {isAuthenticated ? (
          <main className="min-h-0 flex-1 p-3">
            <LilysProcurementWorkspace />
          </main>
        ) : (
          <main className="min-h-0 flex-1 p-3">
            <LoginWorkspace />
          </main>
        )}
      </AuthStatus>
    </div>
  );
}
