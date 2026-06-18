import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveTomatoHealth, TOMATO_REWARDS } from "@/lib/gamification";
import { awardTomatoes } from "@/lib/tomatoes";

// Resurrect the mascot once he's died from inactivity. Costs REVIVE_PET_COST tomatoes
// (recorded as a feed_pet spend, which the health model treats as an activity reset).
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const cost = TOMATO_REWARDS.REVIVE_PET_COST;

  const [earnsRes, revivesRes, profileRes] = await Promise.all([
    admin.from("tomato_transactions").select("created_at").eq("user_id", user.id).gt("amount", 0).order("created_at", { ascending: false }).limit(60),
    admin.from("tomato_transactions").select("created_at").eq("user_id", user.id).eq("reason", "feed_pet").order("created_at", { ascending: false }).limit(60),
    admin.from("user_profiles").select("tomato_balance").eq("user_id", user.id).single(),
  ]);

  const toDates = (rows: { created_at: string }[] | null) =>
    [...new Set((rows ?? []).map((e) => new Date(e.created_at).toISOString().slice(0, 10)))];
  const earnDates = toDates(earnsRes.data);
  const reviveDates = toDates(revivesRes.data);
  const balance = profileRes.data?.tomato_balance || 0;

  // Only a dead mascot can be revived.
  const current = deriveTomatoHealth(earnDates, reviveDates);
  if (current.state !== "dead") {
    return NextResponse.json({ error: "not_dead", mascot: current, balance }, { status: 400 });
  }
  if (balance < cost) {
    return NextResponse.json({ error: "insufficient", needed: cost, have: balance }, { status: 400 });
  }

  const spend = await awardTomatoes({ userId: user.id, amount: -cost, reason: "feed_pet" });
  if (!spend.awarded) {
    return NextResponse.json({ error: "revive_failed" }, { status: 500 });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const mascot = deriveTomatoHealth(earnDates, [todayStr, ...reviveDates]);
  return NextResponse.json({ success: true, balance: spend.newBalance, mascot });
}
