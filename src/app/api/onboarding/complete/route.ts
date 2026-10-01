import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = z.object({ display_name: z.string().trim().min(1).max(60) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a name of 1–60 characters." }, { status: 400 });
  const { data, error } = await createAdminClient().from("user_profiles").update({ display_name: parsed.data.display_name, onboarding_completed: true }).eq("user_id", user.id).select("user_id").single();
  if (error || !data) return NextResponse.json({ error: "Your setup could not be saved. Please retry." }, { status: 503 });
  const response = NextResponse.json({ success: true });
  response.cookies.set("marco_onboarded", "1", { path: "/", maxAge: 31536000, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}
