import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server"; // Fixed import type
import { Database } from "@/lib/types";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    // Default redirect to /onboarding if 'next' is not provided
    const next = requestUrl.searchParams.get("next") ?? "/onboarding";

    if (code) {
        // Creates a new Response to hold cookies
        const response = NextResponse.redirect(new URL(next, requestUrl.origin));

        const supabaseResponse = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                db: {
                    schema: "public",
                },
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                        });
                    },
                    remove(name: string, options: CookieOptions) {
                        response.cookies.set({
                            name,
                            value: "",
                            ...options,
                        });
                    },
                },
            }
        );

        const { error } = await supabaseResponse.auth.exchangeCodeForSession(code);

        if (!error) {
            // Append verified=true to the destination URL so the frontend knows we just came from a confirmation
            const nextUrl = new URL(next, requestUrl.origin);
            nextUrl.searchParams.set("verified", "true");
            return NextResponse.redirect(nextUrl);
        }
    }

    // If no code, or error, redirect to origin
    // We might want to redirect to an error page or back to onboarding with query param
    return NextResponse.redirect(new URL("/onboarding?error=auth_code_error", requestUrl.origin));
}
