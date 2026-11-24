import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isServed, localISO } from "@/lib/potluck";
import { readSubmissionExtras } from "@/lib/potluck-server";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), crew_id: z.uuid(), theme: z.string().trim().min(1).max(100), deadline: z.iso.date() }).strict(),
  // "I'm bringing these" — from your saved recipes, before you have cooked
  // them. A list, because the picker lets you choose several at once and one
  // round trip beats five.
  z.object({ action: z.literal("claim"), potluck_id: z.uuid(), recipe_ids: z.array(z.uuid()).min(1).max(12), co_user_id: z.uuid().nullish() }).strict(),
  // Changing one of your dishes for a different recipe.
  z.object({ action: z.literal("swap"), potluck_id: z.uuid(), submission_id: z.uuid(), recipe_id: z.uuid() }).strict(),
  // Taking one back.
  z.object({ action: z.literal("remove"), potluck_id: z.uuid(), submission_id: z.uuid() }).strict(),
  // "I already made it" — a cook you have posted to this table.
  z.object({ action: z.literal("submit"), potluck_id: z.uuid(), cook_id: z.uuid(), co_user_id: z.uuid().nullish() }).strict(),
  // A claim becoming the dish: attach the cook you actually made to THAT one.
  z.object({ action: z.literal("cooked"), potluck_id: z.uuid(), submission_id: z.uuid(), cook_id: z.uuid() }).strict(),
]);

export async function GET(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const table = new URL(request.url).searchParams.get("table");
  let query = sb.from("potlucks").select("*, submissions:potluck_submissions(id,user_id,cook:cooks(id,title,photo_url,author_name,source_recipe_id))").order("created_at", { ascending: false }).limit(30);
  if (table) query = query.eq("crew_id", table);
  const [potlucks, cooks] = await Promise.all([
    query,
    sb.from("cooks").select("id,title,photo_url,crew_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (potlucks.error || cooks.error) return NextResponse.json({ error: "Potlucks could not be loaded." }, { status: 503 });
  const rows = (potlucks.data ?? []) as { id: string }[];
  const extras = await readSubmissionExtras(sb, rows.map((p) => p.id));
  return NextResponse.json({
    potlucks: potlucks.data ?? [],
    cooks: cooks.data ?? [],
    userId: user.id,
    extras: extras.bySubmission,
    extrasReady: extras.ready,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

type Sb = Awaited<ReturnType<typeof createClient>>;
type Potluck = { crew_id: string; status: string; deadline: string | null };

/* A potluck you can still put a dish on: it exists, it is not over, and you
   are at the table. Returns the potluck, or the response to send instead. */
async function openPotluck(sb: Sb, potluckId: string, userId: string): Promise<{ potluck: Potluck } | { fail: NextResponse }> {
  const { data: potluck } = await sb.from("potlucks").select("crew_id,status,deadline").eq("id", potluckId).maybeSingle();
  if (!potluck) return { fail: NextResponse.json({ error: "This potluck is unavailable." }, { status: 404 }) };
  // The cook-by date is the close, not just a label: once it has passed the
  // table has been served and the spread is finished. Enforced here because
  // nothing flips `status` on a schedule — see lib/potluck.
  //
  // A full day of grace, because "today" here is the SERVER's date. Without it
  // a cook west of the server could be refused a dish their own screen still
  // shows as open. The screen is the honest one; this only has to stop posts
  // to a potluck that is plainly over.
  const closedSince = localISO(new Date(Date.now() - 86_400_000));
  if (isServed(potluck, closedSince)) return { fail: NextResponse.json({ error: "This potluck has been served." }, { status: 409 }) };
  const { data: member } = await sb.from("crew_members").select("crew_id").eq("crew_id", potluck.crew_id).eq("user_id", userId).maybeSingle();
  if (!member) return { fail: NextResponse.json({ error: "Join this table first." }, { status: 403 }) };
  return { potluck };
}

/* Cooked together: one dish, two names. The co-cook is credit, not authorship
   — the row still belongs to whoever submitted it.
 *
 * This used to also refuse anyone already on the table, because a person could
 * only be in a potluck once. Now that you can bring several dishes that is
 * wrong twice over: the friend who helped with two of yours is named on two of
 * them, and they can still bring their own. All that is left to check is that
 * they are at this table, and that you are not naming yourself. */
async function checkCoCook(sb: Sb, crewId: string, userId: string, coUserId: string): Promise<NextResponse | null> {
  if (coUserId === userId) return NextResponse.json({ error: "Pick someone else at the table." }, { status: 400 });
  const { data: coMember } = await sb.from("crew_members").select("user_id").eq("crew_id", crewId).eq("user_id", coUserId).maybeSingle();
  if (!coMember) return NextResponse.json({ error: "They are not at this table." }, { status: 403 });
  return null;
}

function writeFailed(error: { code?: string }, fallback: string): NextResponse {
  if (error.code === "23505") return NextResponse.json({ error: "That dish is already on the table." }, { status: 409 });
  // 42703 = the column is not there yet, i.e. a migration has not been run.
  if (error.code === "42703") return NextResponse.json({ error: "That part is not switched on yet." }, { status: 409 });
  return NextResponse.json({ error: fallback }, { status: 409 });
}

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the potluck details." }, { status: 400 });
  const body = parsed.data;

  if (body.action === "create") {
    const member = await sb.from("crew_members").select("crew_id").eq("crew_id", body.crew_id).eq("user_id", user.id).maybeSingle();
    if (member.error || !member.data) return NextResponse.json({ error: "Join this table first." }, { status: 403 });
    const { error } = await sb.from("potlucks").insert({ crew_id: body.crew_id, theme: body.theme, deadline: body.deadline, created_by: user.id });
    return error ? NextResponse.json({ error: "Potluck could not be created." }, { status: 503 }) : NextResponse.json({ success: true });
  }

  const gate = await openPotluck(sb, body.potluck_id, user.id);
  if ("fail" in gate) return gate.fail;
  const { potluck } = gate;

  // ── Say what you're bringing ──────────────────────────────────────────────
  if (body.action === "claim") {
    // Owner-scoped on purpose: `recipes` is RLS'd to its owner anyway, but the
    // explicit filter means a borrowed id comes back as "not yours" rather
    // than as a row somebody else could put on your table.
    const { data: picked } = await sb.from("recipes").select("id,title,image_url").eq("user_id", user.id).in("id", body.recipe_ids);
    const recipes = picked ?? [];
    if (recipes.length === 0) return NextResponse.json({ error: "Pick one of your saved recipes." }, { status: 403 });

    const coUserId = body.co_user_id ?? null;
    if (coUserId) {
      const bad = await checkCoCook(sb, potluck.crew_id, user.id, coUserId);
      if (bad) return bad;
    }

    // Each claim carries its OWN title and image. `recipes` is RLS'd to its
    // owner, so reading through to the recipe would show everyone else at the
    // table a blank — and a potluck should record what you said at the time
    // anyway, not whatever the recipe is called months later.
    const rows = recipes.map((r) => ({
      potluck_id: body.potluck_id, user_id: user.id,
      recipe_id: r.id, claimed_title: r.title, claimed_image: r.image_url,
      ...(coUserId ? { co_user_id: coUserId } : {}),
    }));
    const { error } = await sb.from("potluck_submissions").insert(rows);
    if (!error) return NextResponse.json({ success: true, added: rows.length });
    // A 23505 HERE means `unique (potluck_id, user_id)` is still in place —
    // the row is refused because you already have one dish, not because this
    // dish is a duplicate. That is migration-potluck-many-dishes.sql not
    // having been run, and saying "already on the table" would send somebody
    // looking for a dish that is not there.
    if (error.code === "23505") return NextResponse.json({ error: "Bringing more than one dish is not switched on yet." }, { status: 409 });
    return writeFailed(error, "Your dishes could not be added.");
  }

  // ── Changing one of yours for something else ──────────────────────────────
  if (body.action === "swap") {
    const [{ data: recipe }, { data: own }] = await Promise.all([
      sb.from("recipes").select("id,title,image_url").eq("id", body.recipe_id).eq("user_id", user.id).maybeSingle(),
      sb.from("potluck_submissions").select("id").eq("id", body.submission_id).eq("potluck_id", body.potluck_id).eq("user_id", user.id).maybeSingle(),
    ]);
    if (!recipe) return NextResponse.json({ error: "Pick one of your saved recipes." }, { status: 403 });
    if (!own) return NextResponse.json({ error: "That is not one of your dishes." }, { status: 403 });
    const { error } = await sb.from("potluck_submissions")
      .update({ recipe_id: recipe.id, claimed_title: recipe.title, claimed_image: recipe.image_url })
      .eq("id", own.id);
    return error ? writeFailed(error, "Your dish could not be changed.") : NextResponse.json({ success: true });
  }

  // ── Taking one back ───────────────────────────────────────────────────────
  if (body.action === "remove") {
    // The row filter is the authorisation, not just a lookup: RLS allows
    // deleting your own rows, and user_id here keeps a stray id from reaching
    // somebody else's dish even if that ever changed.
    const { error } = await sb.from("potluck_submissions").delete()
      .eq("id", body.submission_id).eq("potluck_id", body.potluck_id).eq("user_id", user.id);
    return error ? writeFailed(error, "Your dish could not be removed.") : NextResponse.json({ success: true });
  }

  // ── A claim becoming the dish ─────────────────────────────────────────────
  if (body.action === "cooked") {
    const [{ data: cook }, { data: own }] = await Promise.all([
      sb.from("cooks").select("id,crew_id").eq("id", body.cook_id).eq("user_id", user.id).maybeSingle(),
      sb.from("potluck_submissions").select("id").eq("id", body.submission_id).eq("potluck_id", body.potluck_id).eq("user_id", user.id).maybeSingle(),
    ]);
    if (!cook || cook.crew_id !== potluck.crew_id) return NextResponse.json({ error: "Choose one of your cooks posted to this table." }, { status: 403 });
    if (!own) return NextResponse.json({ error: "That is not one of your dishes." }, { status: 403 });
    const { error } = await sb.from("potluck_submissions").update({ cook_id: cook.id }).eq("id", own.id);
    return error ? writeFailed(error, "Your dish could not be updated.") : NextResponse.json({ success: true });
  }

  // ── I already made it ─────────────────────────────────────────────────────
  const { data: cook } = await sb.from("cooks").select("id,crew_id").eq("id", body.cook_id).eq("user_id", user.id).maybeSingle();
  if (!cook || cook.crew_id !== potluck.crew_id) return NextResponse.json({ error: "Choose one of your cooks posted to this table." }, { status: 403 });

  const coUserId = body.co_user_id ?? null;
  if (coUserId) {
    const bad = await checkCoCook(sb, potluck.crew_id, user.id, coUserId);
    if (bad) return bad;
  }

  const { error } = await sb.from("potluck_submissions").insert({ potluck_id: body.potluck_id, cook_id: body.cook_id, user_id: user.id, ...(coUserId ? { co_user_id: coUserId } : {}) });
  return error ? writeFailed(error, "Your dish could not be added.") : NextResponse.json({ success: true });
}
