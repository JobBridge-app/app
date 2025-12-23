"use client";

import Link from "next/link";
import Image from "next/image";

export function LeftBrandChip() {
    return (
        <Link href="/app-home" className="group flex items-center gap-3 px-2 pr-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/15 transition-all">
            {/* Logo Container */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600/20 shadow-inner overflow-hidden border border-white/10">
                <Image
                    src="/logo2-jobbridge.png"
                    alt="JobBridge Logo"
                    width={40}
                    height={40}
                    className="object-cover w-full h-full scale-110"
                />
            </div>

            {/* Text Container */}
            <div className="flex flex-col justify-center">
                <span className="font-bold text-lg leading-none tracking-tight text-white drop-shadow-sm">
                    <span className="hidden sm:inline">JobBridge</span>
                    <span className="sm:hidden">JB</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-300">
                    Rheinbach
                </span>
            </div>
        </Link>
    );
}
