"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export function DemoIndicator({ userId }: { userId?: string }) {
    const [isDemo, setIsDemo] = useState(false);

    useEffect(() => {
        if (!userId) return;
        const checkDemo = async () => {
            const { data } = await supabaseBrowser.from("demo_sessions").select("enabled").eq("user_id", userId).single();
            if (data?.enabled) setIsDemo(true);
        };
        checkDemo();
    }, [userId]);

    if (!isDemo) return null;

    return (
        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-500 text-[10px] font-bold tracking-widest uppercase animate-pulse">
            DEMO
        </span>
    );
}
