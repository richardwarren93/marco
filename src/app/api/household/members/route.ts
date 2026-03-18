import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// DELETE: Owner removes a member
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const body = await request.json();
  const { user_id: targetUserId } = body;

  if (!targetUserId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "Use the leave endpoint to remove yourself" },
      { status: 400 }
    );
  }

  // Verify caller is an owner
  const { data: callerMembership } = await admin
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .single();

  if (!callerMembership || callerMembership.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can remove members" }, { status: 403 });
  }

  // Verify target is in the same household
  const { data: targetMembership } = await admin
    .from("household_members")
    .select("id")
    .eq("user_id", targetUserId)
    .eq("household_id", callerMembership.household_id)
    .single();

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  try {
    const { error } = await admin
      .from("household_members")
      .delete()
      .eq("id", targetMembership.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove member" },
      { status: 500 }
    );
  }
}
