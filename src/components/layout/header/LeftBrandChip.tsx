"use client";

import Link from "next/link";
import Image from "next/image";
import { BRAND_NAME } from "@/lib/constants";
import type { Market } from "@/lib/types";

export function LeftBrandChip({ market }: { market: Market | null }) {
    return (
        <Link
            href="/app-home"
            className="group flex h-[52px] items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 pl-[6px] pr-3 shadow-xl backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:bg-slate-900/50 md:pr-4"
        >
            <div className="relative h-10 w-10 shrink-0 rounded-full border border-white/10 bg-white/5 p-[1px]">
                <div className="h-full w-full overflow-hidden rounded-full bg-indigo-600/20">
                    <Image
                        src="/logo2-jobbridge.png"
                        alt="JobBridge Logo"
                        width={44}
                        height={44}
                        className="h-full w-full scale-105 object-cover"
                    />
                </div>
            </div>

            <div className="hidden md:flex flex-col justify-center">
                <span className="text-lg font-bold leading-none tracking-tight text-white">
                    {market?.brand_prefix || BRAND_NAME}
                </span>
                {market?.display_name && (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200/90">
                        {market.display_name}
                    </span>
                )}
            </div>
        </Link>
    );
}
