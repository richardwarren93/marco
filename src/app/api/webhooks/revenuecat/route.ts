import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// RevenueCat → Supabase entitlement sync. RevenueCat POSTs here on every
// subscription lifecycle event; we map the customer (app_user_id, which we set
// to the Supabase user id via Purchases.logIn) to their profile and write the
// subscription columns with the service-role client (the only writer the
// protect_subscription_columns trigger allows).
//
// Setup (see PHASE2-SETUP.md): in the RevenueCat dashboard add this URL as a
// webhook and set the Authorization header value to REVENUECAT_WEBHOOK_SECRET.

export const runtime = "nodejs";

// Event types that mean the customer currently has (or retains) access.
const ACTIVE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
  "NON_RENEWING_PURCHASE",
]);
// Cancellation / billing issue: access continues until expiration, but
// auto-renew is off.
const GRACE_EVENTS = new Set(["CANCELLATION", "BILLING_ISSUE"]);
// Access has ended.
const EXPIRE_EVENTS = new Set(["EXPIRATION", "SUBSCRIPTION_PAUSED"]);

interface RCEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
}

export async function POST(request: Request) {
  // Auth: RevenueCat sends the exact Authorization header value configured in
  // the dashboard. Reject anything that doesn't match.
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expected || request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: RCEvent;
  try {
    const body = await request.json();
    event = body?.event ?? {};
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const type = event.type;
  const appUserId = event.app_user_id || event.original_app_user_id;

  // Ignore anonymous customers (pre-logIn) and unmappable ids.
  if (!appUserId || appUserId.startsWith("$RCAnonymousID")) {
    return NextResponse.json({ ok: true, ignored: "anonymous" });
  }

  let tier: "free" | "plus" | null = null;
  let willRenew = false;
  if (type && ACTIVE_EVENTS.has(type)) {
    tier = "plus";
    willRenew = true;
  } else if (type && GRACE_EVENTS.has(type)) {
    tier = "plus"; // still active until expiry; resolveTier downgrades after.
    willRenew = false;
  } else if (type && EXPIRE_EVENTS.has(type)) {
    tier = "free";
  } else {
    // TRANSFER, TEST, and anything else — acknowledge without changing state.
    return NextResponse.json({ ok: true, ignored: type ?? "unknown" });
  }

  const admin = createAdminClient();
  const update: Record<string, unknown> = {
    subscription_tier: tier,
    plus_will_renew: willRenew,
    plus_updated_at: new Date().toISOString(),
    plus_product_id: event.product_id ?? null,
    plus_expires_at:
      tier === "free"
        ? null
        : event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : null,
  };

  const { error } = await admin
    .from("user_profiles")
    .update(update)
    .eq("user_id", appUserId);

  if (error) {
    console.error("RevenueCat webhook update failed:", error.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tier });
}
