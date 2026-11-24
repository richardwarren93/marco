import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isServed, localISO } from "@/lib/potluck";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), crew_id: z.uuid(), theme: z.string().trim().min(1).max(100), deadline: z.iso.date() }).strict(),
  z.object({ action: z.literal("submit"), potluck_id: z.uuid(), cook_id: z.uuid() }).strict(),
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
  return NextResponse.json({ potlucks: potlucks.data ?? [], cooks: cooks.data ?? [], userId: user.id }, { headers: { "Cache-Control": "private, no-store" } });
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
  const { error } = await sb.from("potluck_submissions").insert({ potluck_id: body.potluck_id, cook_id: body.cook_id, user_id: user.id });
  return error ? NextResponse.json({ error: error.code === "23505" ? "You have already added a dish." : "Your dish could not be added." }, { status: 409 }) : NextResponse.json({ success: true });
}
