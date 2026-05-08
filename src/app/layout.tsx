import type { Metadata, Viewport } from "next";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JobBridge",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#020617" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TestModeBanner } from "@/components/admin/TestModeBanner";

const themeBootstrapScript = `
(() => {
  try {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  } catch {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="bg-slate-950" suppressHydrationWarning>
      <body className={`${fontSans.variable} min-h-screen bg-background antialiased selection:bg-blue-500/30`}>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <ThemeProvider defaultTheme="system" enableSystem={true} storageKey="jobbridge-theme">
          <TestModeBanner />
          {children}
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
