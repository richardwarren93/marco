import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("cooking_goals")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ goal: data || null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { weekly_target } = await request.json();
  if (!weekly_target || weekly_target < 1 || weekly_target > 7) {
    return NextResponse.json({ error: "weekly_target must be 1-7" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cooking_goals")
    .upsert(
      { user_id: user.id, weekly_target, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Cooking goal error:", error);
    return NextResponse.json({ error: "Failed to save goal" }, { status: 500 });
  }

  return NextResponse.json({ goal: data });
}
