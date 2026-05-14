import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || !UUID_PATTERN.test(userId)) {
        return NextResponse.json({ isStaff: false }, { status: 400 });
    }

    try {
        const supabase = await supabaseServer();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ isStaff: false }, { status: 401 });
        }

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
