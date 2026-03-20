import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const protectedPaths = ["/dashboard", "/recipes", "/pantry", "/meal-plan", "/collections", "/eats", "/friends", "/profile"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith("/onboarding");

  // Allow public access to shared collection pages and friend code landing pages
  const isPublicPath =
    pathname.startsWith("/collections/shared/") ||
    pathname.startsWith("/add/");

  // Unauthenticated users can't access protected paths or onboarding
  if (!user && (isProtected || isOnboarding) && !isPublicPath) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Authenticated users on auth pages → redirect
  if (user && pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Onboarding gate: redirect new users to onboarding, completed users away from it
  if (user && (isProtected || isOnboarding) && !isPublicPath) {
    const onboardedCookie = request.cookies.get("marco_onboarded")?.value;

    if (onboardedCookie === "true") {
      // Already onboarded — if they're on /onboarding, send to dashboard
      if (isOnboarding) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } else {
      // No cookie — check the database
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        // Set cookie for future requests so we skip the DB check
        if (isOnboarding) {
          const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
          redirect.cookies.set("marco_onboarded", "true", {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 365,
          });
          return redirect;
        }
        // Set cookie on normal response too
        response.cookies.set("marco_onboarded", "true", {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
        });
      } else if (!isOnboarding) {
        // Not onboarded and not on onboarding page — redirect there
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/recipes/:path*",
    "/pantry/:path*",
    "/meal-plan/:path*",
    "/collections/:path*",
    "/eats/:path*",
    "/friends/:path*",
    "/profile/:path*",
    "/add/:path*",
    "/auth/:path*",
    "/onboarding/:path*",
  ],
};
