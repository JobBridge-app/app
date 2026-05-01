import React from "react";
import { LegalSidebar } from "@/components/legal/LegalSidebar";

export const metadata = {
  title: "Trust Center | JobBridge",
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="legal-shell min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_58%,#eaf0f8_100%)] text-slate-950 selection:bg-indigo-500/25 dark:bg-[linear-gradient(180deg,#020617_0%,#071022_56%,#020617_100%)] dark:text-slate-50">

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(79,70,229,0.08)_0%,transparent_34%,rgba(14,165,233,0.09)_68%,transparent_100%)] dark:bg-[linear-gradient(115deg,rgba(99,102,241,0.16)_0%,transparent_38%,rgba(20,184,166,0.10)_72%,transparent_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent dark:via-indigo-200/20" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 md:py-16 lg:px-8">
        <div className="grid min-w-0 gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10 lg:gap-20">

          <LegalSidebar />

          <main className="flex-1 min-w-0">
            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/[0.88] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-md dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8 sm:backdrop-blur-xl md:p-12 lg:p-14">
              <article className="legal-document max-w-none">
                {children}
              </article>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
