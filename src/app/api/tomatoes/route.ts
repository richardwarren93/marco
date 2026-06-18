import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveTomatoHealth } from "@/lib/gamification";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const [profileRes, transactionsRes, earnsRes, revivesRes] = await Promise.all([
    admin.from("user_profiles").select("tomato_balance").eq("user_id", user.id).single(),
    admin
      .from("tomato_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    // Positive-only history (recent), for the mascot's earning-consistency health.
    admin
      .from("tomato_transactions")
      .select("created_at")
      .eq("user_id", user.id)
      .gt("amount", 0)
      .order("created_at", { ascending: false })
      .limit(60),
    // Revives (feed_pet spends) — resurrection points that reset the death latch.
    admin
      .from("tomato_transactions")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("reason", "feed_pet")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const toDates = (rows: { created_at: string }[] | null) =>
    [...new Set((rows ?? []).map((e) => new Date(e.created_at).toISOString().slice(0, 10)))];

  return NextResponse.json({
    balance: profileRes.data?.tomato_balance || 0,
    transactions: transactionsRes.data || [],
    mascot: deriveTomatoHealth(toDates(earnsRes.data), toDates(revivesRes.data)),
  });
}
