import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { CrossmintProviders } from "@/providers/crossmint-providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lily's Boutique | Intranet Procurement Portal",
  description:
    "Lily's Boutique enterprise procurement with Crossmint embedded payment infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <CrossmintProviders>{children}</CrossmintProviders>
      </body>
    </html>
  );
}
