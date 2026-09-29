import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The learning signal: when a user edits an extraction's dish name, upgrade that
// memory row's label to the corrected one, so future visually-similar photos are
// hinted with the human-confirmed answer. Best-effort.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { memoryId, dishName } = await request.json();
    if (!memoryId || !dishName || typeof dishName !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const admin = createAdminClient();
    // Posting = a human reviewed it. Trust this label (kept or corrected) and
    // mark the memory confirmed so future similar photos can learn from it.
    await admin.from("extraction_memory").update({ dish_name: dishName.trim().slice(0, 120), confirmed: true }).eq("id", memoryId).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // never surface learning failures to the user
  }
}
