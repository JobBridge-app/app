"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, FileText, Scale, Cookie, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/legal/impressum", label: "Impressum", icon: FileText },
  { href: "/legal/datenschutz", label: "Datenschutz", icon: Shield },
  { href: "/legal/agb", label: "AGB & Nutzung", icon: Scale },
  { href: "/legal/cookies", label: "Cookie-Richtlinien", icon: Cookie },
];

export function LegalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full min-w-0 shrink-0 md:sticky md:top-10 md:w-64 md:self-start">
      <div>
        <Link
          href="/"
          className="group mb-6 inline-flex items-center text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
        >
          <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/75 text-slate-500 shadow-sm transition-colors group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:group-hover:bg-white/10 dark:group-hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Zurück zur App
        </Link>
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-white">
          <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Trust Center
        </h2>
        <nav className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto pb-3 md:flex-col md:overflow-x-visible md:pb-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200",
                  isActive
                    ? "border-indigo-200/80 bg-indigo-600/10 text-indigo-700 shadow-sm shadow-indigo-900/5 dark:border-indigo-400/25 dark:bg-indigo-400/10 dark:text-indigo-200"
                    : "border-transparent text-slate-600 hover:border-slate-200/80 hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/[0.05] dark:hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-600 dark:text-indigo-300" : "text-slate-500 dark:text-slate-500")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
