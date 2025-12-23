"use client";

import { Profile } from "@/lib/types";
import { LeftBrandChip } from "./header/LeftBrandChip";
import { CenterNavPill } from "./header/CenterNavPill";
import { RightActionGroup } from "./header/RightActionGroup";
import { DemoIndicator } from "./header/DemoIndicator";

export function AppHeader({ profile, isDemo }: { profile: Profile | null; isDemo?: boolean; children?: React.ReactNode }) {

    return (
        <header className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 md:px-8 pointer-events-none">
            {/* 3-Island Layout Container using Grid or Flex */}
            {/* pointer-events-none on container so clicks pass through gaps, verify this logic */}
            {/* Actually, floating elements should catch events. Container is invisible. */}

            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4 pointer-events-auto">

                {/* 1. Left: Brand */}
                <div className="flex-shrink-0 flex items-center gap-3">
                    <LeftBrandChip />
                </div>

                {/* 2. Center: Nav - Absolute center on desktop, fluid on mobile */}
                <div className="hidden md:flex absolute left-1/2 top-4 -translate-x-1/2">
                    <CenterNavPill profile={profile} />
                </div>
                {/* Mobile version of Nav usually sits in bottom bar or similar, but req says "Header icon-only" */}
                {/* We can keep it in flow for mobile, but shrink it */}
                <div className="flex md:hidden">
                    <CenterNavPill profile={profile} />
                </div>

                {/* 3. Right: Actions */}
                <div className="flex-shrink-0 flex justify-end">
                    <RightActionGroup profile={profile} isDemo={isDemo} />
                </div>
            </div>

            {/* Mobile Nav Spacer if needed? No, separate nav handles it. */}
        </header>
    );
}
