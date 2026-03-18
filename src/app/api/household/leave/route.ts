import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find user's membership
  const { data: membership } = await admin
    .from("household_members")
    .select("id, household_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not in a household" }, { status: 400 });
  }

  // Count members
  const { count } = await admin
    .from("household_members")
    .select("*", { count: "exact", head: true })
    .eq("household_id", membership.household_id);

  try {
    if (count === 1) {
      // Last member — delete the household entirely (cascade deletes membership)
      await admin
        .from("households")
        .delete()
        .eq("id", membership.household_id);
    } else if (membership.role === "owner") {
      // Owner leaving with other members — transfer ownership to next member
      const { data: nextMember } = await admin
        .from("household_members")
        .select("id, user_id")
        .eq("household_id", membership.household_id)
        .neq("user_id", user.id)
        .order("joined_at", { ascending: true })
        .limit(1)
        .single();

      if (nextMember) {
        // Transfer ownership
        await admin
          .from("household_members")
          .update({ role: "owner" })
          .eq("id", nextMember.id);

        await admin
          .from("households")
          .update({ created_by: nextMember.user_id })
          .eq("id", membership.household_id);
      }

      // Remove self
      await admin
        .from("household_members")
        .delete()
        .eq("id", membership.id);
    } else {
      // Regular member — just remove self
      await admin
        .from("household_members")
        .delete()
        .eq("id", membership.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to leave household" },
      { status: 500 }
    );
  }
}
