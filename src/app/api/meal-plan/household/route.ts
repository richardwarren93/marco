import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: Fetch household members' meal plans for a date range
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find user's household
  const { data: membership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ plans: [] });
  }

  // Get other household members
  const { data: members } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", membership.household_id)
    .neq("user_id", user.id);

  if (!members || members.length === 0) {
    return NextResponse.json({ plans: [] });
  }

  const memberIds = members.map((m: any) => m.user_id);

  // Get profiles for name tagging
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", memberIds);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.user_id, p.display_name])
  );

  // Fetch their meal plans in the date range
  const { data: plans } = await admin
    .from("meal_plans")
    .select("*, recipe:recipes(*)")
    .in("user_id", memberIds)
    .gte("planned_date", start)
    .lte("planned_date", end)
    .order("planned_date", { ascending: true });

  // Tag each plan with the owner's name
  const taggedPlans = (plans || []).map((plan: any) => ({
    ...plan,
    owner_name: profileMap.get(plan.user_id) || "Housemate",
  }));

  return NextResponse.json({ plans: taggedPlans });
}
