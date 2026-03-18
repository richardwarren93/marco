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

  const admin = createAdminClient();

  // Check if user is already in a household
  const { data: existing } = await admin
    .from("household_members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "You're already in a household. Leave it first to join another." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const rawCode = (body.invite_code || "").trim().toUpperCase();

  // Normalize: accept "XXXX" or "HOUSE-XXXX"
  const inviteCode = rawCode.startsWith("HOUSE-") ? rawCode : `HOUSE-${rawCode}`;

  if (!/^HOUSE-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(inviteCode)) {
    return NextResponse.json({ error: "Invalid invite code format" }, { status: 400 });
  }

  // Look up household
  const { data: household } = await admin
    .from("households")
    .select("id, name")
    .eq("invite_code", inviteCode)
    .single();

  if (!household) {
    return NextResponse.json({ error: "No household found with that code" }, { status: 404 });
  }

  try {
    const { error } = await admin
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: "member",
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      household: { id: household.id, name: household.name },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join household" },
      { status: 500 }
    );
  }
}
