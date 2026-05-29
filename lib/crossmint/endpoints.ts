/** Crossmint API endpoints surfaced in the infrastructure trace. */
export const crossmintApiEndpoints = {
  authSendEmailOtp: {
    method: "POST" as const,
    path: "Crossmint Auth · sendEmailOtp",
    description: "Dispatch email OTP to operator",
  },
  authConfirmEmailOtp: {
    method: "POST" as const,
    path: "Crossmint Auth · confirmEmailOtp",
    description: "Verify OTP and establish session",
  },
  treasuryBalance: {
    method: "GET" as const,
    path: "/api/treasury/balance",
    upstream: "GET /2025-06-09/wallets/{address}/balances",
    description: "Read company treasury stablecoin balance",
  },
  treasuryFundStaging: {
    method: "POST" as const,
    path: "/api/treasury/fund-staging",
    upstream: "POST /api/v1-alpha2/wallets/{address}/balances (stagingFund USDXM)",
    description: "Mint USDXM test stablecoin into treasury (staging only)",
  },
  treasuryExecutePayment: {
    method: "POST" as const,
    path: "/api/treasury/execute-payment",
    upstream: "POST /2025-06-09/wallets/{address}/transactions (simulated in demo mode)",
    description: "Simulate vendor disbursement from company treasury",
  },
  treasuryRegisterSigner: {
    method: "POST" as const,
    upstream: "POST /2025-06-09/wallets/{address}/signers (addSigner server)",
    description: "Register operational server signer on treasury wallet (live mode only)",
  },
  treasuryConnect: {
    method: "GET" as const,
    path: "/api/treasury/balance",
    upstream: "GET /2025-06-09/wallets/{address}",
    description: "Resolve shared company treasury wallet",
  },
} as const;
