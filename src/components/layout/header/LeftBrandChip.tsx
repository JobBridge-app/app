"use client";

import Link from "next/link";
import { BRAND_NAME } from "@/lib/constants";
import type { Market } from "@/lib/types";
import { ThemedLogoImage } from "@/components/ui/ThemedLogoImage";

export function LeftBrandChip({ market }: { market: Market | null }) {
    return (
        <Link
            href="/app-home"
            prefetch={false}
            className="app-brand-chip group flex h-[52px] items-center gap-2 rounded-full border pl-[6px] pr-3 shadow-xl backdrop-blur-md transition-all duration-200 md:pr-4"
        >
            <div className="app-brand-logo-ring relative h-10 w-10 shrink-0 rounded-full border p-[1px]">
                <div className="app-brand-logo-badge h-full w-full overflow-hidden rounded-full">
                    <ThemedLogoImage
                        alt="JobBridge Logo"
                        width={44}
                        height={44}
                        className="app-brand-logo-image h-full w-full scale-[1.22] object-cover object-center"
                    />
                </div>
            </div>

            <div className="app-brand-chip-label hidden flex-col justify-center md:flex">
                <span className="app-brand-chip-title -my-[3px] max-w-[7.5rem] truncate py-[3px] text-base font-semibold leading-[1.02] tracking-[-0.035em] text-white md:max-w-none md:text-[19px]">
                    {market?.brand_prefix || BRAND_NAME}
                </span>
                {market?.display_name && (
                    <span className="app-brand-chip-subtitle hidden text-xs font-medium leading-[1.15] tracking-[-0.01em] text-sky-100/70 md:block">
                        {market.display_name}
                    </span>
                )}
            </div>
        </Link>
    );
}
