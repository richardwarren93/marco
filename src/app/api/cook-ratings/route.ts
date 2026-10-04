import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKETS = ["loved", "fine", "nope"] as const;
type Bucket = (typeof BUCKETS)[number];

// GET ?sentiment=loved → the user's already-ranked dishes in that bucket
// (ascending by score), each with recipe title + photo, so the client can run
// the head-to-head comparison and place the new cook.
export async function GET(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sentiment = new URL(request.url).searchParams.get("sentiment") as Bucket | null;
  if (!sentiment || !BUCKETS.includes(sentiment)) return NextResponse.json({ error: "sentiment required" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cook_ratings")
    .select("recipe_id,score,recipes(title,image_url)")
    .eq("user_id", user.id).eq("sentiment", sentiment)
    .order("score", { ascending: true });
  if (error) return NextResponse.json({ error: "Could not load your rankings." }, { status: 503 });
  type Rec = { title: string | null; image_url: string | null };
  type Row = { recipe_id: string; score: number; recipes: Rec | Rec[] | null };
  const items = ((data ?? []) as unknown as Row[]).map((r) => {
    const rec = Array.isArray(r.recipes) ? r.recipes[0] : r.recipes;
    return { recipe_id: r.recipe_id, score: r.score, title: rec?.title ?? "A dish", image_url: rec?.image_url ?? null };
  });
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
}

// POST { recipe_id, sentiment, score } → upsert the final placement.
export async function POST(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const recipe_id = typeof body.recipe_id === "string" ? body.recipe_id : null;
  const sentiment = BUCKETS.includes(body.sentiment) ? (body.sentiment as Bucket) : null;
  const score = typeof body.score === "number" && body.score >= 0 && body.score <= 10 ? body.score : null;
  if (!recipe_id || !sentiment || score === null) return NextResponse.json({ error: "recipe_id, sentiment, score required" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from("cook_ratings").upsert({ user_id: user.id, recipe_id, sentiment, score, updated_at: new Date().toISOString() }, { onConflict: "user_id,recipe_id" });
  if (error) return NextResponse.json({ error: "Could not save your rating." }, { status: 503 });
  return NextResponse.json({ success: true });
}
