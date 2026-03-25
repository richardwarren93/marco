import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/notifications/read
// Body: { id?: string }  — omit id to mark ALL as read
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { id } = body as { id?: string };

  let query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id);

  if (id) {
    query = query.eq("id", id);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
