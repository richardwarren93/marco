import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // Onboarding deferred — land everyone in the new social app.
      const res = NextResponse.redirect(`${origin}/friends-stack`);
      res.cookies.set("marco_onboarded", "1", { path: "/", maxAge: 31536000, sameSite: "lax" });
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could+not+authenticate`);
}
