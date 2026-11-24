import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isServed, localISO } from "@/lib/potluck";
import { readCoCooks } from "@/lib/potluck-server";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), crew_id: z.uuid(), theme: z.string().trim().min(1).max(100), deadline: z.iso.date() }).strict(),
  z.object({ action: z.literal("submit"), potluck_id: z.uuid(), cook_id: z.uuid(), co_user_id: z.uuid().nullish() }).strict(),
]);
export async function GET(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const table = new URL(request.url).searchParams.get("table");
  let query = sb.from("potlucks").select("*, submissions:potluck_submissions(id,user_id,cook:cooks(id,title,photo_url,author_name,source_recipe_id))").order("created_at", { ascending: false }).limit(30);
  if (table) query = query.eq("crew_id", table);
  const [potlucks, cooks] = await Promise.all([query, sb.from("cooks").select("id,title,photo_url,crew_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100)]);
  if (potlucks.error || cooks.error) return NextResponse.json({ error: "Potlucks could not be loaded." }, { status: 503 });
  const rows = (potlucks.data ?? []) as { id: string }[];
  const co = await readCoCooks(sb, rows.map((p) => p.id));
  return NextResponse.json({ potlucks: potlucks.data ?? [], cooks: cooks.data ?? [], userId: user.id, coCooks: co.bySubmission, coCooksReady: co.ready }, { headers: { "Cache-Control": "private, no-store" } });
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
  const { data: potluck } = await sb.from("potlucks").select("crew_id,status,deadline").eq("id", body.potluck_id).maybeSingle();
  if (!potluck) return NextResponse.json({ error: "This potluck is unavailable." }, { status: 404 });
  // The cook-by date is the close, not just a label: once it has passed the
  // table has been served and the spread is finished. Enforced here because
  // nothing flips `status` on a schedule — see lib/potluck.
  //
  // A full day of grace, because "today" here is the SERVER's date. Without it
  // a cook west of the server could be refused a dish their own screen still
  // shows as open. The screen is the honest one; this only has to stop posts
  // to a potluck that is plainly over.
  const closedSince = localISO(new Date(Date.now() - 86_400_000));
  if (isServed(potluck, closedSince)) return NextResponse.json({ error: "This potluck has been served." }, { status: 409 });
  const [{ data: member }, { data: cook }] = await Promise.all([
    sb.from("crew_members").select("crew_id").eq("crew_id", potluck.crew_id).eq("user_id", user.id).maybeSingle(),
    sb.from("cooks").select("id,crew_id").eq("id", body.cook_id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!member || !cook || cook.crew_id !== potluck.crew_id) return NextResponse.json({ error: "Choose one of your cooks posted to this table." }, { status: 403 });

  // Cooked together: one dish, two names. The co-cook is credit, not
  // authorship — the row still belongs to whoever submitted it.
  const coUserId = body.co_user_id ?? null;
  if (coUserId) {
    if (coUserId === user.id) return NextResponse.json({ error: "Pick someone else at the table." }, { status: 400 });
    const [{ data: coMember }, { data: taken }] = await Promise.all([
      sb.from("crew_members").select("user_id").eq("crew_id", potluck.crew_id).eq("user_id", coUserId).maybeSingle(),
      sb.from("potluck_submissions").select("id,user_id,co_user_id").eq("potluck_id", body.potluck_id),
    ]);
    if (!coMember) return NextResponse.json({ error: "They are not at this table." }, { status: 403 });
    // A person is in a potluck once, whichever side of a dish they are on.
    // The partial unique index catches a repeat co-cook; this catches the
    // cross case it cannot see — someone who already brought a dish of their
    // own — because those are two different columns on two different rows.
    const already = (taken ?? []) as { user_id: string; co_user_id: string | null }[];
    if (already.some((r) => r.user_id === coUserId || r.co_user_id === coUserId)) {
      return NextResponse.json({ error: "They are already on the table with a dish." }, { status: 409 });
    }
  }

  const { error } = await sb.from("potluck_submissions").insert({ potluck_id: body.potluck_id, cook_id: body.cook_id, user_id: user.id, ...(coUserId ? { co_user_id: coUserId } : {}) });
  if (!error) return NextResponse.json({ success: true });
  if (error.code === "23505") return NextResponse.json({ error: "You have already added a dish." }, { status: 409 });
  // 42703 = the column is not there yet, i.e. the migration has not been run.
  if (error.code === "42703") return NextResponse.json({ error: "Cooking together is not switched on yet." }, { status: 409 });
  return NextResponse.json({ error: "Your dish could not be added." }, { status: 409 });
}
