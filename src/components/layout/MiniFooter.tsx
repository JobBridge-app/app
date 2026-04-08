import React from "react";
import Link from "next/link";

export function MiniFooter() {
  return (
    <div className="fixed bottom-6 w-full z-50 pointer-events-none px-6">
      <div className="max-w-md mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pointer-events-auto text-[11px] font-medium text-slate-500/80">
        <Link href="/legal/impressum" className="hover:text-slate-300 dark:hover:text-slate-200 transition-colors">
          Impressum
        </Link>
        <span className="text-slate-700/50 dark:text-slate-600/50">&middot;</span>
        <Link href="/legal/datenschutz" className="hover:text-slate-300 dark:hover:text-slate-200 transition-colors">
          Datenschutz
        </Link>
        <span className="text-slate-700/50 dark:text-slate-600/50">&middot;</span>
        <Link href="/legal/agb" className="hover:text-slate-300 dark:hover:text-slate-200 transition-colors">
          AGB
        </Link>
        <span className="text-slate-700/50 dark:text-slate-600/50">&middot;</span>
        <Link href="/legal/cookies" className="hover:text-slate-300 dark:hover:text-slate-200 transition-colors">
          Cookies
        </Link>
      </div>
      <div className="mt-2 text-center text-[10px] text-slate-600/40 pointer-events-auto">
        &copy; {new Date().getFullYear()} JobBridge
      </div>
    </div>
  );
}
