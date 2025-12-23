import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "JobBridge",
  description:
    "JobBridge – Plattform für sichere Taschengeldjobs und Alltagshilfe.",
};

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { MarketProvider } from "@/components/providers/MarketProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${fontSans.variable} min-h-screen bg-background antialiased selection:bg-blue-500/30`}>
        <ThemeProvider defaultTheme="dark" enableSystem={false} storageKey="jobbridge-theme">
          <MarketProvider>
            {children}
          </MarketProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
