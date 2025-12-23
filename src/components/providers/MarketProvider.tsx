"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { Market } from "@/lib/types";

type MarketProviderProps = {
    children: React.ReactNode;
    defaultMarket?: Market | null;
};

type MarketProviderState = {
    currentMarket: Market | null;
    isLoading: boolean;
};

const MarketProviderContext = createContext<MarketProviderState>({
    currentMarket: null,
    isLoading: true,
});

export function MarketProvider({ children, defaultMarket }: MarketProviderProps) {
    const [market, setMarket] = useState<Market | null>(defaultMarket || null);
    const [isLoading, setIsLoading] = useState(!defaultMarket);

    useEffect(() => {
        if (defaultMarket) return;

        const loadMarket = async () => {
            const { data: { user } } = await supabaseBrowser.auth.getUser();
            if (!user) {
                setIsLoading(false);
                return;
            }

            // Fetch profile's market_id
            const { data: profile } = await supabaseBrowser
                .from("profiles")
                .select("market_id")
                .eq("id", user.id)
                .single();

            if (profile?.market_id) {
                const { data: marketData } = await supabaseBrowser
                    .from("regions_live")
                    .select("id, slug, city, is_live, display_name, brand_prefix")
                    .eq("id", profile.market_id)
                    .single();

                if (marketData) {
                    setMarket({
                        id: marketData.id,
                        slug: marketData.slug || marketData.city.toLowerCase(),
                        display_name: marketData.display_name || marketData.city,
                        brand_prefix: marketData.brand_prefix || "JobBridge",
                        is_live: marketData.is_live
                    });
                }
            }
            setIsLoading(false);
        };

        loadMarket();
    }, [defaultMarket]);

    return (
        <MarketProviderContext.Provider value={{ currentMarket: market, isLoading }}>
            {children}
        </MarketProviderContext.Provider>
    );
}

export const useMarket = () => useContext(MarketProviderContext);
