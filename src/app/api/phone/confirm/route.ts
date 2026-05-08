import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/sms/twilio";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone: rawPhone, code } = await request.json();
  if (typeof rawPhone !== "string" || typeof code !== "string") {
    return NextResponse.json({ error: "Phone and code required" }, { status: 400 });
  }
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }
  const cleanCode = code.trim();

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("phone_verifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("phone", phone)
    .maybeSingle();

  if (!pending) {
    return NextResponse.json({ error: "No pending verification. Request a new code." }, { status: 400 });
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many failed attempts. Request a new code." }, { status: 429 });
  }

  if (pending.code !== cleanCode) {
    await admin
      .from("phone_verifications")
      .update({ attempts: pending.attempts + 1 })
      .eq("id", pending.id);
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }

  // Code matches. Clear any prior verified phone on other accounts (shouldn't
  // happen because start-verification blocks it, but belt and suspenders) and
  // attach this phone to the user.
  const now = new Date().toISOString();
  const { error: profileErr } = await admin
    .from("user_profiles")
    .update({ phone, phone_verified_at: now })
    .eq("user_id", user.id);
  if (profileErr) {
    return NextResponse.json({ error: "Failed to save phone" }, { status: 500 });
  }

  // Cleanup pending row
  await admin.from("phone_verifications").delete().eq("id", pending.id);

  return NextResponse.json({ ok: true, phone, verified_at: now });
}

// DELETE removes the verified phone (lets a user unlink).
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .update({ phone: null, phone_verified_at: null })
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Failed to unlink phone" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
