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
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const pathname = request.nextUrl.pathname;

  const protectedPaths = ["/dashboard", "/recipes", "/pantry", "/meal-plan", "/collections", "/eats", "/friends", "/profile", "/grocery"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith("/onboarding");

  // Allow public access to shared collection pages and friend code landing pages
  const isPublicPath =
    pathname.startsWith("/collections/shared/") ||
    pathname.startsWith("/add/");

  // Not logged in → redirect to login for protected/onboarding paths
  if (!user && (isProtected || isOnboarding) && !isPublicPath) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // For logged-in users, check onboarding status (cookie first, then DB fallback)
  if (user && (isProtected || isOnboarding || pathname.startsWith("/auth/"))) {
    let onboarded = request.cookies.get("marco_onboarded")?.value === "1";

    // If no cookie, check the database and set cookie for future requests
    if (!onboarded) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      onboarded = profile?.onboarding_completed === true;

      if (onboarded) {
        // Set cookie so we don't hit DB again
        response.cookies.set("marco_onboarded", "1", {
          path: "/",
          maxAge: 31536000,
          sameSite: "lax",
        });
      }
    }

    // Logged in on auth pages → redirect away
    if (pathname.startsWith("/auth/")) {
      return NextResponse.redirect(
        new URL(onboarded ? "/recipes" : "/onboarding", request.url)
      );
    }

    // Logged in on protected pages → check onboarding
    if (isProtected && !isPublicPath && !onboarded) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // Logged in on onboarding but already done → go to recipes
    if (isOnboarding && onboarded) {
      const res = NextResponse.redirect(new URL("/recipes", request.url));
      res.cookies.set("marco_onboarded", "1", {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
      return res;
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
    "/grocery/:path*",
    "/add/:path*",
    "/auth/:path*",
    "/onboarding",
    "/onboarding/:path*",
  ],
};
