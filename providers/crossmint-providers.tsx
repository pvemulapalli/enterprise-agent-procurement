"use client";

import {
  CrossmintAuthProvider,
  CrossmintProvider,
  CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-ui";

import { crossmintAppearance } from "@/lib/crossmint/appearance";
import { crossmintConfig } from "@/lib/crossmint/config";
import { Alert } from "@/components/ui/alert";

type CrossmintProvidersProps = {
  children: React.ReactNode;
};

function MissingApiKeyFallback() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Alert variant="error" title="Configuration required">
        Set <code className="font-mono">NEXT_PUBLIC_CROSSMINT_API_KEY</code> in{" "}
        <code className="font-mono">.env.local</code>. See{" "}
        <code className="font-mono">.env.example</code> for details.
      </Alert>
    </div>
  );
}

export function CrossmintProviders({ children }: CrossmintProvidersProps) {
  const apiKey = crossmintConfig.apiKey;

  if (!apiKey) {
    return <MissingApiKeyFallback />;
  }

  return (
    <CrossmintProvider apiKey={apiKey}>
      <CrossmintAuthProvider
        loginMethods={[...crossmintConfig.auth.loginMethods]}
        authModalTitle={crossmintConfig.auth.authModalTitle}
        appearance={crossmintAppearance}
      >
        <CrossmintWalletProvider
          appearance={crossmintAppearance}
          showPasskeyHelpers={false}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
