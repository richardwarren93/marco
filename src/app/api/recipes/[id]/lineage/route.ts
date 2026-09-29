import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/recipes/:id/lineage
 * The recipe's lineage — every cook posted from it (mine and others', same or
 * tweaked), newest first, plus the true total count for social proof. Admin-
 * backed so the count reflects everyone who cooked it, not just cooks visible at
 * the viewer's table; sanitized to the on-card fields (author identity is the
 * point of a cook card — no private table/save data).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("cooks")
    .select("id, user_id, title, note, photo_url, card_treatment, author_name, author_avatar, created_at")
    .eq("source_recipe_id", id)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ count: 0, cooks: [] });

  const cooks = (data ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,               // for tapping through to the cook's member profile
    title: c.title,
    note: c.note,                     // the variation ("added chili", "used tofu")
    photo_url: c.photo_url,
    card_treatment: c.card_treatment || "polaroid",
    author_name: c.author_name,
    author_avatar: c.author_avatar,
    created_at: c.created_at,
    isMine: c.user_id === user.id,
  }));

  return NextResponse.json({ count: cooks.length, cooks });
}
