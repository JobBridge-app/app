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
    <div className="min-h-screen bg-background selection:bg-indigo-500/30">

      {/* Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-8 md:py-20 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-24">

          <LegalSidebar />

          <main className="flex-1 min-w-0">
            <div className="glass-surface rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-14 shadow-2xl shadow-black/20 ring-1 ring-white/10">
              <article className="prose prose-slate dark:prose-invert max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight 
                prose-h1:text-3xl prose-h1:mb-8 prose-h1:bg-gradient-to-br prose-h1:from-white prose-h1:to-slate-400 prose-h1:text-transparent prose-h1:bg-clip-text
                prose-h2:text-xl prose-h2:mt-12 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4
                prose-p:leading-relaxed prose-p:text-slate-300
                prose-li:text-slate-300 prose-ul:mt-4
                prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-a:font-medium prose-a:transition-colors prose-a:no-underline hover:prose-a:underline
                prose-strong:text-slate-200">
                {children}
              </article>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
