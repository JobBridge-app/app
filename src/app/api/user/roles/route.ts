import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ isStaff: false }, { status: 400 });
    }

    try {
        const { count, error } = await supabaseAdmin()
            .from("user_system_roles")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        if (error) {
            console.error("Error checking staff status via API:", error);
            return NextResponse.json({ isStaff: false }, { status: 500 });
        }

        return NextResponse.json({ isStaff: (count || 0) > 0 });
    } catch (e) {
        console.error("Exception checking staff status via API:", e);
        return NextResponse.json({ isStaff: false }, { status: 500 });
    }
}
