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
    const { plan_ids } = await request.json();
    if (!Array.isArray(plan_ids) || plan_ids.length === 0) {
      return NextResponse.json({ error: "plan_ids array is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Delete only plans owned by the current user
    const { error } = await admin
      .from("meal_plans")
      .delete()
      .in("id", plan_ids)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk remove meal plans error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove" },
      { status: 500 }
    );
  }
}
