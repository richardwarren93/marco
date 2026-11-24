import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { readCoCooks } from "@/lib/potluck-server";

export async function GET(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your tables." }, { status: 401 });
  const selected = new URL(request.url).searchParams.get("table");
  const memberships = await sb.from("crew_members").select("crew_id").eq("user_id", user.id);
  if (memberships.error) return NextResponse.json({ error: "Your tables could not be loaded." }, { status: 503 });
  const ids = (memberships.data ?? []).map(m => m.crew_id);
  if (selected && !ids.includes(selected)) return NextResponse.json({ error: "Table not found." }, { status: 404 });
  const cooksQuery = sb.from("cooks").select("*").order("created_at", { ascending: false }).limit(30);
  const [profile, crews, members, cooks, saves, potlucks] = await Promise.all([
    sb.from("user_profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    ids.length ? sb.from("crews").select("*").in("id", ids).order("created_at") : Promise.resolve({ data: [], error: null }),
    ids.length ? sb.from("crew_members").select("crew_id,user_id,display_name,avatar").in("crew_id", ids) : Promise.resolve({ data: [], error: null }),
    selected ? cooksQuery.eq("crew_id", selected) : ids.length ? cooksQuery.or(`user_id.eq.${user.id},crew_id.in.(${ids.join(",")})`) : cooksQuery.eq("user_id", user.id),
    sb.from("saves").select("cook_id").eq("user_id", user.id),
    // Enough of this table's potlucks for the Table card to say what is on,
    // when it is due and who has brought something. Riding along here keeps
    // Table at one request; /potluck fetches the full spread itself.
    ids.length ? sb.from("potlucks").select("id,crew_id,theme,emoji,deadline,status,submissions:potluck_submissions(id,user_id)").in("crew_id", selected ? [selected] : ids).order("created_at", { ascending: false }).limit(10) : Promise.resolve({ data: [], error: null }),
  ]);
  if ([profile, crews, members, cooks, saves, potlucks].some(r => r.error)) return NextResponse.json({ error: "Your table could not be loaded. Please retry." }, { status: 503 });
  const name = profile.data?.display_name || user.email?.split("@")[0] || "You";
  // So the Table bar can say "your dish is in" when you are the SECOND name on
  // somebody else's dish, not only when you brought your own.
  const co = await readCoCooks(sb, ((potlucks.data ?? []) as { id: string }[]).map((p) => p.id));
  return NextResponse.json({
    me: { id: user.id, name, avatar: name.slice(0, 1).toUpperCase(), isYou: true },
    tables: (crews.data ?? []).map(crew => ({ crew, members: (members.data ?? []).filter(m => m.crew_id === crew.id).map(m => ({ id: m.user_id, name: m.user_id === user.id ? name : m.display_name || "Friend", avatar: m.avatar || (m.display_name || name).slice(0, 1).toUpperCase(), isYou: m.user_id === user.id })).sort((a, b) => Number(b.isYou) - Number(a.isYou)) })),
    cooks: cooks.data ?? [], savedIds: (saves.data ?? []).map(s => s.cook_id),
    potlucks: potlucks.data ?? [], coCooks: co.bySubmission,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
