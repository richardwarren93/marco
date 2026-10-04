import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hash } from "@/lib/imessage/protocol";

export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await createAdminClient().from("imessage_links").select("created_at").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Connection unavailable. Please retry." }, { status: 503 });
  // Marco's public iMessage number — served to the page (vs a NEXT_PUBLIC_ env)
  // so there's no browser-exposed build-time var. It still reaches the client to
  // build the tap-to-text link, which is fine: it's a public number.
  return NextResponse.json({ linked: !!data, account: user.email || "your signed-in Marco account", marcoNumber: process.env.MARCO_IMESSAGE || null }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const code = randomBytes(12).toString("hex");
  const expires = new Date(Date.now() + 600_000).toISOString();
  const { error } = await createAdminClient().from("imessage_codes").upsert({ user_id: user.id, code_hash: hash(code), expires_at: expires }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Could not create a code." }, { status: 503 });
  return NextResponse.json({ code, expires }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = createAdminClient();
  const codes = await admin.from("imessage_codes").delete().eq("user_id", user.id);
  const links = await admin.from("imessage_links").delete().eq("user_id", user.id);
  if (codes.error || links.error) return NextResponse.json({ error: "Could not disconnect. Retry." }, { status: 503 });
  return NextResponse.json({ linked: false });
}
