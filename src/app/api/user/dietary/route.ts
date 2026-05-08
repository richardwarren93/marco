import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIETARY_FILTERS } from "@/lib/cook/dietary";

/**
 * GET  /api/user/dietary  → { filters: string[] }
 * POST /api/user/dietary  body { filters: string[] } → { filters: string[] }
 *
 * Profile-level dietary toggles. POST replaces the array wholesale; the
 * profile page sends the full set every time so partial updates aren't
 * needed. Unknown filter ids are dropped silently (forward-compat with old
 * clients after we add filters).
 */

const ALLOWED_IDS = new Set(DIETARY_FILTERS.map((f) => f.id));

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("dietary_filters")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("dietary GET failed:", error);
    return NextResponse.json({ filters: [] });
  }
  return NextResponse.json({ filters: (data?.dietary_filters as string[] | null) ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { filters?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!Array.isArray(body.filters)) {
    return NextResponse.json({ error: "filters must be an array" }, { status: 400 });
  }

  const cleaned = Array.from(
    new Set(
      body.filters
        .filter((v): v is string => typeof v === "string")
        .filter((id) => ALLOWED_IDS.has(id as never)),
    ),
  );

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .update({ dietary_filters: cleaned, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select("dietary_filters")
    .single();

  if (error) {
    console.error("dietary POST failed:", error);
    return NextResponse.json({ error: "Could not save filters" }, { status: 500 });
  }
  return NextResponse.json({ filters: (data?.dietary_filters as string[] | null) ?? [] });
}
