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
    <aside className="w-full md:w-64 shrink-0">
      <div>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-white transition-colors group mb-6"
        >
          <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mr-3 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Zurück zur App
        </Link>
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-400" />
          Trust Center
        </h2>
        <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium whitespace-nowrap",
                  isActive
                    ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-indigo-400" : "text-slate-500")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
