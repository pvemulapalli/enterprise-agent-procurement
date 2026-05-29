"use client";

import { useCallback, useRef, useState } from "react";

import { LilysBoutiqueLogo } from "@/components/brand/lilys-boutique-logo";
import { InfrastructureTrace } from "@/components/procurement/infrastructure-trace";
import type { ActivityEntry } from "@/lib/procurement/types";
import { crossmintAppDisplayName } from "@/lib/crossmint/config";
import { crossmintApiEndpoints } from "@/lib/crossmint/endpoints";

import { EmailOtpLogin } from "./email-otp-login";

export function LoginWorkspace() {
  const [activityTrace, setActivityTrace] = useState<ActivityEntry[]>([]);
  const activitySeqRef = useRef(0);

  const appendTrace = useCallback(
    (
      title: string,
      message: string,
      status: ActivityEntry["status"] = "info",
      kind: ActivityEntry["kind"] = "human",
      extras?: Pick<ActivityEntry, "request" | "response" | "endpoint" | "httpMethod">,
    ) => {
      const timestamp = new Date();
      activitySeqRef.current += 1;
      const sequence = activitySeqRef.current;
      setActivityTrace((current) => [
        ...current,
        {
          id: `login-${timestamp.getTime()}-${sequence}`,
          kind,
          title,
          message,
          timestamp,
          status,
          sequence,
          endpoint: extras?.endpoint,
          httpMethod: extras?.httpMethod,
          request: extras?.request,
          response: extras?.response,
        },
      ]);
    },
    [],
  );

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
      <div className="flex h-full w-[65%] shrink-0 flex-col bg-[#f5f5f7] text-slate-900">
        <header className="shrink-0 border-b border-slate-200/80 bg-white px-8 py-4">
          <div className="flex items-center gap-6">
            <LilysBoutiqueLogo variant="light" size="lg" />
            <div className="hidden h-10 w-px bg-slate-200 sm:block" />
            <h1 className="hidden text-lg font-semibold tracking-tight text-slate-700 sm:block">
              Intranet Procurement Portal
            </h1>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600 sm:hidden">
            Intranet Procurement Portal
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-10">
          <div className="mb-8 max-w-md text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Operator access
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Sign in to {crossmintAppDisplayName}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Enter any real email address you can access — we&apos;ll send a
              one-time passcode (OTP) to continue. Use your personal or work inbox;
              there is no pre-approved operator list for this demo.
            </p>
          </div>
          <EmailOtpLogin
            variant="light"
            onOtpSent={(email) => {
              appendTrace(
                "Verification code dispatched",
                `One-time passcode sent to ${email}.`,
                "success",
              );
              appendTrace(
                "Crossmint Auth · sendEmailOtp",
                "Email OTP authentication initiated via Crossmint embedded auth.",
                "info",
                "crossmint",
                {
                  endpoint: crossmintApiEndpoints.authSendEmailOtp.path,
                  httpMethod: crossmintApiEndpoints.authSendEmailOtp.method,
                  request: { operation: "auth.sendEmailOtp", email },
                  response: { status: "OTP_DISPATCHED" },
                },
              );
            }}
            onOtpVerified={(email) => {
              appendTrace(
                "Operator identity confirmed",
                `${email} authenticated. Connecting shared corporate treasury wallet…`,
                "success",
              );
              appendTrace(
                "Crossmint Auth · confirmEmailOtp",
                "Session material refreshed; treasury funding will begin on portal load.",
                "success",
                "crossmint",
                {
                  endpoint: crossmintApiEndpoints.authConfirmEmailOtp.path,
                  httpMethod: crossmintApiEndpoints.authConfirmEmailOtp.method,
                  request: { operation: "auth.confirmEmailOtp", email },
                  response: { status: "AUTHENTICATED" },
                },
              );
            }}
            onOtpError={(message) => {
              appendTrace("Authentication failed", message, "warning");
            }}
          />
        </div>
      </div>

      <div className="h-full w-[35%] shrink-0">
        <InfrastructureTrace
          activityTrace={activityTrace}
          auditEvents={[]}
          walletStatus="not-loaded"
          showWalletSection={false}
        />
      </div>
    </div>
  );
}
