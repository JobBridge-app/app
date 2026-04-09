import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/types";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Legal-Seiten vollständig statisch - Auth-Overhead überspringen
  const path = request.nextUrl.pathname;
  if (path.startsWith("/legal")) {
    return response;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Keep request cookies in sync so downstream middleware/handlers see latest auth.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set({ name, value });
          });

          // Re-create the response once, then apply all cookie mutations.
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  // IMPORTANT: Use getUser() instead of getSession() in middleware.
  // getUser() contacts the Supabase Auth server, validates the JWT, and
  // refreshes the session if the access token has expired.
  // Wrap in try/catch: stale/invalid refresh tokens should not crash the middleware.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Invalid or missing refresh token — treat as unauthenticated.
    // The browser will get fresh tokens on next login.
  }

  const isProtectedPath =
    path.startsWith("/admin") ||
    path.startsWith("/staff") ||
    path.startsWith("/analytics") ||
    path.startsWith("/moderation");

  if (isProtectedPath) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Fetch user system roles
    const { data: rolesData } = await supabase
      .from("user_system_roles")
      .select("role:system_roles(name)")
      .eq("user_id", user.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRoles = (rolesData || []).map((r: any) => r.role?.name).filter(Boolean);

    let hasAccess = false;
    const isStaff = userRoles.includes("admin") || userRoles.includes("moderator") || userRoles.includes("analyst");

    if (path.startsWith("/admin") || path.startsWith("/staff")) {
      hasAccess = isStaff;
    } else if (path.startsWith("/analytics")) {
      hasAccess = userRoles.includes("admin") || userRoles.includes("analyst");
    } else if (path.startsWith("/moderation")) {
      hasAccess = userRoles.includes("admin") || userRoles.includes("moderator");
    }

    if (!hasAccess) {
      return NextResponse.redirect(new URL("/app-home", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)"],
};
