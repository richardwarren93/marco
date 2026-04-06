import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // Check if user has already completed onboarding
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", data.user.id)
        .single();

      if (profile?.onboarding_completed) {
        const res = NextResponse.redirect(`${origin}/recipes`);
        res.cookies.set("marco_onboarded", "1", { path: "/", maxAge: 31536000, sameSite: "lax" });
        return res;
      }
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could+not+authenticate`);
}
