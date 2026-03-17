import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const [profileRes, transactionsRes] = await Promise.all([
    admin.from("user_profiles").select("tomato_balance").eq("user_id", user.id).single(),
    admin
      .from("tomato_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    balance: profileRes.data?.tomato_balance || 0,
    transactions: transactionsRes.data || [],
  });
}
