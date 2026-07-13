import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMascotHealth } from "@/lib/tomatoes";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const [profileRes, transactionsRes, mascot] = await Promise.all([
    admin.from("user_profiles").select("tomato_balance").eq("user_id", user.id).single(),
    admin
      .from("tomato_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    // Positive earns + revives → mascot health (shared derivation in lib/tomatoes).
    getMascotHealth(admin, user.id),
  ]);

  return NextResponse.json({
    balance: profileRes.data?.tomato_balance || 0,
    transactions: transactionsRes.data || [],
    mascot,
  });
}
