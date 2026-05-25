import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
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
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TestModeBanner } from "@/components/admin/TestModeBanner";

const themeBootstrapScript = `
(() => {
  try {
    const storageKey = "jobbridge-theme";
    const storedTheme = localStorage.getItem(storageKey);
    const theme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
    const resolvedTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    root.dataset.themePreference = theme;
    root.dataset.themeResolved = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  } catch {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="bg-background" suppressHydrationWarning>
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${fontSans.variable} min-h-screen bg-background text-foreground antialiased selection:bg-blue-500/30`}>
        <ThemeProvider defaultTheme="system" enableSystem={true} storageKey="jobbridge-theme">
          <TestModeBanner />
          {children}
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
