import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Permanently delete the calling user's account.
//
// Apple App Store guideline 5.1.1(v) requires any app with sign-in to
// offer an in-app account-deletion path. Sign-out alone is not enough.
//
// All user-owned tables (recipes, meal_plans, pantry_items, friendships,
// recipe_shares, collections, household_members, etc.) reference
// auth.users(id) with ON DELETE CASCADE, so a single
// `auth.admin.deleteUser` call wipes the user's data graph atomically.
// If a future table is added without CASCADE, this route will leave
// orphaned rows — keep that invariant in mind when migrating.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sign the user out server-side so their cookie session is invalidated
  // in addition to the auth.users row being gone.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
