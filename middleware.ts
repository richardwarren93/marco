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

  // For logged-in users, check onboarding status from the cookie only.
  // The cookie is set at login, signup callback, and onboarding completion;
  // hitting the DB here makes middleware too slow under load (504
  // MIDDLEWARE_INVOCATION_TIMEOUT). When the cookie is missing — e.g. a
  // returning user on a new device — we redirect to /onboarding, which does
  // its own DB check and either shows the flow or sends the user on.
  if (user && (isProtected || isOnboarding || pathname.startsWith("/auth/"))) {
    const onboarded = request.cookies.get("marco_onboarded")?.value === "1";

    // Logged in on auth pages → redirect away
    if (pathname.startsWith("/auth/")) {
      return NextResponse.redirect(
        new URL(onboarded ? "/recipes" : "/onboarding", request.url)
      );
    }

    // Logged in on protected pages without onboarded cookie → defer to /onboarding
    if (isProtected && !isPublicPath && !onboarded) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
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
