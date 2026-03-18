import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateHouseholdCode(): string {
  const bytes = randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return `HOUSE-${code}`;
}

// GET: Fetch user's household with members
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find user's household membership
  const { data: membership } = await admin
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ household: null });
  }

  // Fetch household details
  const { data: household } = await admin
    .from("households")
    .select("*")
    .eq("id", membership.household_id)
    .single();

  if (!household) {
    return NextResponse.json({ household: null });
  }

  // Fetch all members with their profiles
  const { data: members } = await admin
    .from("household_members")
    .select("*")
    .eq("household_id", household.id)
    .order("joined_at", { ascending: true });

  // Get profiles for all members
  const memberUserIds = (members || []).map((m: any) => m.user_id);
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("*")
    .in("user_id", memberUserIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

  const membersWithProfiles = (members || []).map((m: any) => ({
    ...m,
    profile: profileMap.get(m.user_id) || null,
  }));

  return NextResponse.json({
    household: {
      ...household,
      members: membersWithProfiles,
    },
    userRole: membership.role,
  });
}

// POST: Create a new household
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
      { error: "You're already in a household. Leave it first to create a new one." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const name = body.name?.trim() || "My Household";

  // Generate unique invite code (retry on collision)
  let inviteCode = generateHouseholdCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: collision } = await admin
      .from("households")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();
    if (!collision) break;
    inviteCode = generateHouseholdCode();
    attempts++;
  }

  try {
    // Create household
    const { data: household, error: houseError } = await admin
      .from("households")
      .insert({
        name,
        created_by: user.id,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (houseError) throw houseError;

    // Add creator as owner
    const { error: memberError } = await admin
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) throw memberError;

    return NextResponse.json({ household });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create household" },
      { status: 500 }
    );
  }
}
