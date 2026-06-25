"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/legal/impressum", label: "Impressum" },
  { href: "/legal/datenschutz", label: "Datenschutz" },
  { href: "/legal/agb", label: "AGB" },
  { href: "/legal/cookies", label: "Cookies" },
];

export function LegalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full min-w-0 shrink-0 md:sticky md:top-8 md:self-start">
      <div className="legal-nav">
        <Link href="/" className="legal-back-link">
          Zurück zur App
        </Link>

        <div className="legal-nav-heading">
          <h2>Trust Center</h2>
        </div>

        <nav aria-label="Rechtliche Dokumente" className="legal-nav-list">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={isActive ? "page" : undefined}
                className={cn("legal-nav-item", isActive && "is-active")}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
