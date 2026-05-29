"use client";

import { useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";

type AuthStatusProps = {
  children: React.ReactNode;
};

export function AuthStatus({ children }: AuthStatusProps) {
  const { status } = useCrossmintAuth();

  if (status === "initializing" || status === "in-progress") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label="Establishing secure operator session…" size="lg" />
      </div>
    );
  }

  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}

type AuthErrorBoundaryProps = {
  message?: string;
};

export function AuthErrorBanner({ message }: AuthErrorBoundaryProps) {
  if (!message) return null;

  return (
    <Alert variant="error" title="Authentication error">
      {message}
    </Alert>
  );
}
