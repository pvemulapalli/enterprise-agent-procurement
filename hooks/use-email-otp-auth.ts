"use client";

import { useCallback, useState } from "react";
import { useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

type CrossmintAuthClient = {
  sendEmailOtp: (email: string) => Promise<{ emailId?: string; state?: string }>;
  confirmEmailOtp: (
    email: string,
    emailId: string,
    token: string,
  ) => Promise<string>;
  handleRefreshAuthMaterial: (oneTimeSecret: string) => Promise<unknown>;
};

type OtpStep = "email" | "verify";

type UseEmailOtpAuthReturn = {
  step: OtpStep;
  email: string;
  isLoading: boolean;
  error: string | null;
  resendCooldown: number;
  setEmail: (email: string) => void;
  sendOtp: () => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  reset: () => void;
  resendOtp: () => Promise<void>;
};

export function useEmailOtpAuth(): UseEmailOtpAuthReturn {
  const { crossmintAuth, getUser } = useCrossmintAuth();
  const authClient = crossmintAuth as CrossmintAuthClient | undefined;

  const [step, setStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [emailId, setEmailId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(60);
    const interval = window.setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, []);

  const sendOtp = useCallback(async (): Promise<boolean> => {
    if (!authClient) {
      setError("Authentication is not ready. Please refresh the page.");
      return false;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Enter a valid corporate email address.");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authClient.sendEmailOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setEmailId(response.emailId ?? response.state ?? null);
      setStep("verify");
      startResendCooldown();
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send verification code. Try again.",
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authClient, email, startResendCooldown]);

  const verifyOtp = useCallback(
    async (code: string): Promise<boolean> => {
      if (!authClient || !emailId) {
        setError("Session expired. Request a new code.");
        setStep("email");
        return false;
      }

      const token = code.trim();
      if (token.length !== 6) {
        setError("Enter the 6-digit code from your email.");
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const oneTimeSecret = await authClient.confirmEmailOtp(
          email,
          emailId,
          token,
        );
        await authClient.handleRefreshAuthMaterial(oneTimeSecret);
        getUser();
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Invalid or expired code. Try again.",
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [authClient, email, emailId, getUser],
  );

  const resendOtp = useCallback(async () => {
    if (resendCooldown > 0) return;
    await sendOtp();
  }, [resendCooldown, sendOtp]);

  const reset = useCallback(() => {
    setStep("email");
    setEmail("");
    setEmailId(null);
    setError(null);
    setResendCooldown(0);
  }, []);

  return {
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
  };
}
