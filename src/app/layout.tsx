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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${fontSans.variable} min-h-screen bg-slate-950 text-slate-50 antialiased`}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
