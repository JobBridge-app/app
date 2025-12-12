import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { Database } from "@/lib/types";

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

        const { data, error } = await supabase
            .from("regions_live")
            .select("*")
            .ilike("city", city)
            .ilike("federal_state", federal_state)
            .eq("country", country || "DE")
            .limit(1);

        if (error) {
            console.error("Supabase error:", error);
            return NextResponse.json({ status: "error" }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ status: "unknown" });
        }

        const region = data[0] as Database["public"]["Tables"]["regions_live"]["Row"];

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
