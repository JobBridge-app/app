import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { city, postal_code, federal_state, country } = body;

        if (!city || !federal_state) {
            return NextResponse.json(
                { error: "Missing required fields: city, federal_state" },
                { status: 400 }
            );
        }

        const supabase = await supabaseServer();

        // Logic: Check if region is in regions_live table
        // Match by city AND federal_state (case insensitive)
        // We optionally use country if provided, otherwise default 'DE' check could be added if table supports multiple countries
        // The table has country default 'DE'.

        let query = supabase
            .from("regions_live")
            .select("*")
            .ilike("city", city)
            .ilike("federal_state", federal_state)
            .eq("country", country || "DE")
            .limit(1);

        // If postal_code is provided, we could potentially filter by it
        // But usually city+state defines the region for rollout.
        // If a city is split into live/not-live by zip, we'd need more complex logic.
        // For now, prompt says: "Wenn postal_code vorhanden ist, darfst du das zusätzlich in die Bedingung integrieren."
        // Let's stick to city/state for broader match, unless specific zip requirements exist.
        // If we want to be strict: if zip is provided, maybe we check if THAT zip is enabled?
        // Let's assume city-wide activation for now to keep it simple as per "Starten in ausgewählten Regionen (Städten)".

        const { data, error } = await query;

        if (error) {
            console.error("Supabase error:", error);
            return NextResponse.json({ status: "error" }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ status: "unknown" });
        }

        const region = data[0];

        if (region.is_live) {
            return NextResponse.json({ status: "live", region });
        } else {
            return NextResponse.json({ status: "not_live", region });
        }
    } catch (err) {
        console.error("API error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
