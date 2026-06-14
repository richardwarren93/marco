import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserTier, countSavedRecipes } from "@/lib/entitlements-server";
import { limitsFor, serializeLimits, isPlus, ENFORCE_ENTITLEMENTS } from "@/lib/entitlements";

// Returns the caller's tier + limits + current usage so the client can show
// locks, remaining counts, and the contextual paywall. Cheap enough to call on
// app load; the client hook caches it.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(supabase, user.id);
  const savedRecipes = await countSavedRecipes(supabase, user.id);

  return NextResponse.json({
    tier,
    isPlus: isPlus(tier),
    enforced: ENFORCE_ENTITLEMENTS,
    limits: serializeLimits(limitsFor(tier)),
    usage: { savedRecipes },
  });
}
