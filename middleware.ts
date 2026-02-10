import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/types";

// Role cache TTL: 5 minutes
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;
const ROLE_CACHE_TTL_SECONDS = 5 * 60;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          // Important: don't recreate the response per-cookie, or earlier cookie writes get lost.
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

  // Refresh session/cookies on each request so SSR sees the latest auth state
  const { data: { session } } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;
  const isProtectedPath =
    path.startsWith("/admin") ||
    path.startsWith("/staff") ||
    path.startsWith("/analytics") ||
    path.startsWith("/moderation");

  if (isProtectedPath) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Try to get cached roles from cookie first (5-minute TTL)
    const rolesCookie = request.cookies.get('user_roles');
    const rolesCacheKey = `roles_${session.user.id}`;
    let userRoles: string[] = [];
    let needsFetch = true;

    if (rolesCookie?.value) {
      try {
        const cached = JSON.parse(rolesCookie.value);
        // Validate cache: check if it's for the same user and not expired
        if (cached.userId === session.user.id && cached.exp > Date.now()) {
          userRoles = cached.roles || [];
          needsFetch = false;
        }
      } catch {
        // Invalid cache, will fetch from DB
      }
    }

    // Fetch user system roles only if cache miss or expired
    if (needsFetch) {
      const { data: rolesData } = await supabase
        .from("user_system_roles")
        .select("role:system_roles(name)")
        .eq("user_id", session.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userRoles = (rolesData || []).map((r: any) => r.role?.name).filter(Boolean);

      // Cache roles in cookie with configured TTL
      const cacheData = {
        userId: session.user.id,
        roles: userRoles,
        exp: Date.now() + ROLE_CACHE_TTL_MS
      };
      response.cookies.set('user_roles', JSON.stringify(cacheData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ROLE_CACHE_TTL_SECONDS
      });
    }

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
