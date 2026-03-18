import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { plan_id } = await request.json();
    if (!plan_id) {
      return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify ownership before deleting
    const { data: plan } = await admin
      .from("meal_plans")
      .select("id, user_id")
      .eq("id", plan_id)
      .single();

    if (!plan || plan.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("meal_plans")
      .delete()
      .eq("id", plan_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove meal plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove" },
      { status: 500 }
    );
  }
}
