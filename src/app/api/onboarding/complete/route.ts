import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { z } from "zod";

// Finalizes onboarding: sets the display name + marks complete, and persists the
// quick setup collected after the tour (weekly cook goal, allergies, household
// shape). Taste is deferred — we flag it pending so the app fires the taste
// profile the next time the user opens up (you can't rank cooks you haven't
// cooked yet).
const schema = z.object({
  display_name: z.string().trim().min(1).max(60),
  weekly_target: z.number().int().min(1).max(7).optional(),
  allergies: z.array(z.string().trim().min(1).max(40)).max(40).optional(),
  household_type: z.string().trim().max(40).optional(),
  household_size: z.number().int().min(1).max(12).optional(),
}).strict();

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a name of 1–60 characters." }, { status: 400 });
  const { display_name, weekly_target, allergies, household_type, household_size } = parsed.data;
  const admin = createAdminClient();

  const { data, error } = await admin.from("user_profiles").update({ display_name, onboarding_completed: true }).eq("user_id", user.id).select("user_id").single();
  if (error || !data) return NextResponse.json({ error: "Your setup could not be saved. Please retry." }, { status: 503 });
  // Any table seat taken before the name was set (an invite tapped at sign-up)
  // still shows the email handle — give it the real name.
  const initial = (Array.from(display_name.trim())[0] ?? "").toUpperCase() || null;
  const seats = await admin.from("crew_members").update({ display_name, avatar: initial }).eq("user_id", user.id);
  if (seats.error) console.warn("[onboarding] seat names not updated", seats.error.code);

  // Optional setup fields. The ongoing in-app guide captures allergies, taste,
  // household etc. now — onboarding usually sends only the name — so we upsert
  // prefs only if something was actually provided.
  const prefs: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  if (allergies) prefs.allergies = allergies;
  if (household_type) prefs.household_type = household_type;
  if (household_size) prefs.household_size = household_size;
  if (Object.keys(prefs).length > 2) {
    const { error: prefErr } = await admin.from("user_preferences").upsert(prefs, { onConflict: "user_id" });
    if (prefErr) console.warn("[onboarding] prefs save failed", prefErr.code);
  }

  if (weekly_target) {
    const { error: goalErr } = await admin.from("cooking_goals").upsert({ user_id: user.id, weekly_target, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (goalErr) console.warn("[onboarding] goal save failed", goalErr.code);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("marco_onboarded", "1", { path: "/", maxAge: 31536000, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}
