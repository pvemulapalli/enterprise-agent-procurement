"use client";

import { useMemo } from "react";

import type { ActivityEntry, AuditEvent } from "@/lib/procurement/types";
import { crossmintConfig } from "@/lib/crossmint/config";
import {
  getPaymentToken,
  getStablecoinEnvironmentNote,
} from "@/lib/crossmint/payment";
import { Badge } from "@/components/ui/badge";

type InfrastructureTraceProps = {
  activityTrace: ActivityEntry[];
  auditEvents: AuditEvent[];
  walletAddress?: string;
  walletStatus: "not-loaded" | "in-progress" | "loaded" | "error";
  treasuryAlias?: string;
  treasuryDisplayName?: string;
  stablecoinBalance?: string | null;
  showWalletSection?: boolean;
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCrossmintEndpoint(entry: ActivityEntry): string | null {
  if (entry.endpoint) {
    const method = entry.httpMethod ?? "POST";
    return `${method} ${entry.endpoint}`;
  }
  const requestEndpoint = entry.request?.endpoint;
  if (typeof requestEndpoint === "string") {
    const method =
      typeof entry.request?.method === "string"
        ? entry.request.method
        : entry.httpMethod ?? "POST";
    return `${method} ${requestEndpoint}`;
  }
  const appRoute = entry.request?.appRoute;
  if (typeof appRoute === "string") {
    const upstream = entry.request?.upstream;
    if (typeof upstream === "string") {
      return `${entry.httpMethod ?? "GET"} ${appRoute} → ${upstream}`;
    }
    return `${entry.httpMethod ?? "GET"} ${appRoute}`;
  }
  return null;
}

function sortActivityNewestFirst(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort((a, b) => {
    const seqA = a.sequence ?? 0;
    const seqB = b.sequence ?? 0;
    if (seqA !== seqB) return seqB - seqA;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
}

function statusDot(status: ActivityEntry["status"]): string {
  switch (status) {
    case "success":
      return "bg-emerald-400";
    case "warning":
      return "bg-amber-400";
    case "pending":
      return "bg-slate-500";
    default:
      return "bg-cyan-400";
  }
}

export function InfrastructureTrace({
  activityTrace,
  auditEvents,
  walletAddress,
  walletStatus,
  treasuryAlias,
  treasuryDisplayName,
  stablecoinBalance,
  showWalletSection = true,
}: InfrastructureTraceProps) {
  const recentActivity = useMemo(
    () => sortActivityNewestFirst(activityTrace),
    [activityTrace],
  );

  const recentAuditEvents = useMemo(
    () => [...auditEvents].reverse(),
    [auditEvents],
  );

  return (
    <aside className="flex h-full flex-col border-l border-slate-800 bg-slate-950 text-[115%]">
      <header className="shrink-0 border-b border-slate-800 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Infrastructure trace
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-slate-100">
          Operator observability
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {showWalletSection ? (
          <section className="mb-5 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Crossmint payment rail
            </p>
            {walletStatus === "in-progress" || walletStatus === "not-loaded" ? (
              <p className="mt-2 text-[14px] text-slate-500">Connecting treasury…</p>
            ) : null}
            {walletStatus === "error" ? (
              <p className="mt-2 text-[14px] text-red-400">
                Treasury unavailable — check server API keys in .env.local
              </p>
            ) : null}
            {walletAddress ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-[14px] font-medium text-emerald-300">
                  Lily&apos;s Boutique Treasury
                  {treasuryAlias ? (
                    <span className="ml-2 text-[12px] font-normal text-slate-400">
                      ({treasuryAlias})
                    </span>
                  ) : null}
                </p>
                {treasuryDisplayName ? (
                  <p className="text-[12px] text-slate-500">{treasuryDisplayName}</p>
                ) : null}
                <p className="break-all font-mono text-[11px] leading-relaxed text-slate-400">
                  {walletAddress}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="success">{crossmintConfig.chain}</Badge>
                  <Badge variant="muted">
                    {getPaymentToken(crossmintConfig.chain).toUpperCase()}
                  </Badge>
                </div>
                {stablecoinBalance ? (
                  <p className="text-[13px] text-slate-500">
                    Balance remaining:{" "}
                    <span className="font-medium tabular-nums text-slate-300">
                      {stablecoinBalance}
                    </span>
                  </p>
                ) : null}
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {getStablecoinEnvironmentNote(crossmintConfig.chain)}
                </p>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="mb-5 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Authentication rail
            </p>
            <p className="mt-2 text-[14px] text-slate-500">
              Awaiting operator sign-in. Crossmint treasury provisioning begins after
              authentication.
            </p>
          </section>
        )}

        {recentAuditEvents.length > 0 ? (
          <section className="mb-5 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Audit log
            </p>
            <ul className="max-h-36 space-y-2 overflow-y-auto">
              {recentAuditEvents.map((event) => (
                <li key={event.id} className="text-[13px] text-slate-500">
                  <span className="text-slate-400">{event.label}</span>
                  <span className="ml-2 font-mono text-[10px] text-slate-600">
                    {formatTime(event.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Activity
        </p>

        {recentActivity.length === 0 ? (
          <p className="text-[14px] text-slate-600">
            Workflow activity will appear here as steps progress.
          </p>
        ) : (
          <ol className="space-y-3">
            {recentActivity.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(entry.status)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-medium text-slate-200">
                        {entry.title}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] text-slate-600">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                    {entry.message ? (
                      <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                        {entry.message}
                      </p>
                    ) : null}
                    {entry.kind === "crossmint" ? (
                      (() => {
                        const endpointLabel = formatCrossmintEndpoint(entry);
                        return endpointLabel ? (
                          <p className="mt-2 font-mono text-[10px] text-cyan-400/90">
                            {endpointLabel}
                          </p>
                        ) : null;
                      })()
                    ) : null}
                    {entry.kind === "crossmint" && entry.request ? (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer text-[11px] text-cyan-500/80 hover:text-cyan-400">
                          Request payload
                        </summary>
                        <pre className="mt-1 overflow-x-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[10px] text-slate-500">
                          {JSON.stringify(entry.request, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                    {entry.kind === "crossmint" && entry.response ? (
                      <details className="mt-1 group">
                        <summary className="cursor-pointer text-[11px] text-cyan-500/80 hover:text-cyan-400">
                          Response payload
                        </summary>
                        <pre className="mt-1 overflow-x-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[10px] text-slate-500">
                          {JSON.stringify(entry.response, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
