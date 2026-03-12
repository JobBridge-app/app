"use client";

import { ReactNode } from "react";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { motion } from "framer-motion";
import clsx from "clsx";

type OnboardingLayoutProps = {
  children: ReactNode;
  stepIndex: number;
  stepCount: number;
  showProgress?: boolean;
};

export function OnboardingLayout({
  children,
  stepCount,
  stepIndex,
  showProgress = true,
}: OnboardingLayoutProps) {
  const progress = Math.round((stepIndex / Math.max(stepCount - 1, 1)) * 100);

  return (
    <div className="relative min-h-screen px-4 py-10 md:px-8 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="floating-blob absolute -left-10 top-10 h-56 w-56 opacity-80" />
        <div className="floating-blob absolute right-0 top-24 h-72 w-72 bg-purple-400/20 blur-3xl" />
        <div className="floating-blob absolute bottom-[-10%] left-1/4 h-80 w-80 bg-cyan-400/25 blur-[90px]" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <LogoBadge size="sm" />
          {showProgress && (
            <div className="flex items-center gap-3 text-sm text-slate-200/80">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              </div>
              <span className="tracking-wide">
                Schritt {stepIndex + 1} / {stepCount}
              </span>
            </div>
          )}
        </div>

        <div
          className={clsx(
            "bg-white/8 backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl shadow-black/40 relative p-6 md:p-10"
          )}
        >
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}
