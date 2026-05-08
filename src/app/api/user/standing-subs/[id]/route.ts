import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/user/standing-subs/[id]
 *   Removes a single standing substitution preference. Used by the ↳ marker
 *   on the recipe detail page when the user wants to revert a sub.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_standing_subs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("standing-subs delete failed:", error);
    return NextResponse.json({ error: "Could not delete preference" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
