"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useEmailOtpAuth } from "@/hooks/use-email-otp-auth";
import { crossmintAppDisplayName } from "@/lib/crossmint/config";

type EmailOtpLoginProps = {
  variant?: "dark" | "light";
  onOtpSent?: (email: string) => void;
  onOtpVerified?: (email: string) => void;
  onOtpError?: (message: string) => void;
};

export function EmailOtpLogin({
  variant = "dark",
  onOtpSent,
  onOtpVerified,
  onOtpError,
}: EmailOtpLoginProps) {
  const {
    step,
    email,
    isLoading,
    error,
    resendCooldown,
    setEmail,
    sendOtp,
    verifyOtp,
    reset,
    resendOtp,
  } = useEmailOtpAuth();

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otpValues = useRef<string[]>(Array(6).fill(""));

  const isLight = variant === "light";

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);
      otpValues.current[index] = digit;
      if (digit && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    },
    [],
  );

  const handleOtpKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace" && !otpValues.current[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [],
  );

  const handleSendOtp = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const success = await sendOtp();
    if (success && normalizedEmail) onOtpSent?.(normalizedEmail);
    if (!success && error) onOtpError?.(error);
  }, [email, error, onOtpError, onOtpSent, sendOtp]);

  const handleVerify = useCallback(async () => {
    const success = await verifyOtp(otpValues.current.join(""));
    if (success) onOtpVerified?.(email);
  }, [email, onOtpVerified, verifyOtp]);

  const handleReset = useCallback(() => {
    otpValues.current = Array(6).fill("");
    reset();
  }, [reset]);

  return (
    <Card
      className={`mx-auto w-full max-w-md ${
        isLight
          ? "!border-slate-200/80 !bg-white shadow-sm ring-1 ring-slate-200/60"
          : ""
      }`}
    >
      <CardHeader>
        {!isLight ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Operator Access
          </p>
        ) : null}
        <h1
          className={`mt-2 text-2xl font-semibold tracking-tight ${
            isLight ? "text-slate-900" : "text-slate-50"
          }`}
        >
          {step === "email"
            ? isLight
              ? "Corporate email"
              : `Sign in to ${crossmintAppDisplayName}`
            : "Confirm operator identity"}
        </h1>
        <p
          className={`mt-2 text-sm leading-relaxed ${
            isLight ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {step === "email"
            ? "Enter any real email you can access — we'll send a one-time code to sign in."
            : `Enter the 6-digit verification code sent to ${email}.`}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="error">{error}</Alert>
        ) : null}

        {step === "email" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendOtp();
            }}
          >
            <Input
              label="Corporate email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
              className={
                isLight
                  ? "!border-slate-300 !bg-white !text-slate-900 placeholder:!text-slate-400"
                  : undefined
              }
            />
            <Button
              type="submit"
              className={`w-full ${
                isLight ? "!bg-slate-900 !text-white hover:!bg-slate-800" : ""
              }`}
              size="lg"
              isLoading={isLoading}
            >
              Send verification code
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <p
                className={`mb-3 text-xs font-medium uppercase tracking-wide ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Verification code
              </p>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`Digit ${index + 1}`}
                    disabled={isLoading}
                    className={
                      isLight
                        ? "h-12 rounded-lg border border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 focus:border-slate-900/40 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        : "h-12 rounded-lg border border-slate-700 bg-slate-900 text-center text-lg font-semibold text-slate-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    }
                    onChange={(event) =>
                      handleOtpChange(index, event.target.value)
                    }
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  />
                ))}
              </div>
            </div>

            <Button
              className={`w-full ${
                isLight ? "!bg-slate-900 !text-white hover:!bg-slate-800" : ""
              }`}
              size="lg"
              isLoading={isLoading}
              onClick={() => void handleVerify()}
            >
              Confirm & access portal
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className={
                  isLight
                    ? "text-slate-500 transition-colors hover:text-slate-800"
                    : "text-slate-400 transition-colors hover:text-slate-200"
                }
                onClick={handleReset}
                disabled={isLoading}
              >
                Change email
              </button>
              <button
                type="button"
                className={
                  isLight
                    ? "text-slate-700 transition-colors hover:text-slate-900 disabled:text-slate-400"
                    : "text-emerald-400 transition-colors hover:text-emerald-300 disabled:text-slate-600"
                }
                onClick={() => void resendOtp()}
                disabled={isLoading || resendCooldown > 0}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend code"}
              </button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <p
          className={`text-xs leading-relaxed ${
            isLight ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Secured by Crossmint embedded payment infrastructure. Operator
          credentials provision programmatic payment accounts with enterprise
          custody controls.
        </p>
      </CardFooter>
    </Card>
  );
}
