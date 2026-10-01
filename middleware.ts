import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Files served straight out of public/. The matcher below covers route prefixes
// like /onboarding/:path*, which also match real assets such as
// /onboarding/recipes/mapo-tofu.jpg — and redirecting an <img> to /auth/login
// hands it an HTML document, i.e. a broken image for every signed-out user in
// the onboarding flow. Bail before any auth work (this also skips a Supabase
// session lookup per asset request).
const STATIC_ASSET =
  /\.(?:jpg|jpeg|png|gif|webp|avif|svg|ico|bmp|mp4|webm|mp3|wav|woff|woff2|ttf|otf|eot|txt|xml|json|webmanifest|map)$/i;

export async function middleware(request: NextRequest) {
  if (STATIC_ASSET.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

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

  const protectedPaths = ["/tonight", "/dashboard", "/recipes", "/pantry", "/meal-plan", "/collections", "/eats", "/friends", "/profile", "/grocery", "/kitchen", "/crew", "/potluck", "/i-cooked", "/create"];
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

  // Let the setup page check the saved profile. Do not intercept OAuth
  // callbacks or password-reset flows for an existing session.
  if (user && ["/auth/login", "/auth/signup"].includes(pathname)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/tonight/:path*",
    "/tonight",
    "/dashboard/:path*",
    "/recipes/:path*",
    "/pantry/:path*",
    "/meal-plan/:path*",
    "/collections/:path*",
    "/eats/:path*",
    "/friends/:path*",
    "/friends-stack/:path*",
    "/kitchen/:path*",
    "/crew/:path*",
    "/potluck/:path*",
    "/i-cooked/:path*",
    "/create/:path*",
    "/profile/:path*",
    "/grocery/:path*",
    "/add/:path*",
    "/auth/:path*",
    "/onboarding",
    "/onboarding/:path*",
  ],
};
