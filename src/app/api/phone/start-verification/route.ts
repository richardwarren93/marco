import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, sendSms, generateVerificationCode, smsConfigured } from "@/lib/sms/twilio";
import { checkRateLimit } from "@/lib/rate-limit";

const VERIFY_ATTEMPTS_PER_DAY = 5;
const CODE_TTL_MINUTES = 10;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Limit verification attempts per user per day so a brute-forcer can't
  // burn SMS credits on us.
  const { allowed } = await checkRateLimit(user.id, "phone-verify-start", VERIFY_ATTEMPTS_PER_DAY);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts today. Try again tomorrow." },
      { status: 429 }
    );
  }

  const { phone: rawPhone } = await request.json();
  if (typeof rawPhone !== "string") {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "Invalid phone number. Use a US number or include country code (+44…)." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // If this phone is already verified by *another* user, refuse early.
  const { data: claimed } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("phone", phone)
    .not("phone_verified_at", "is", null)
    .maybeSingle();
  if (claimed && claimed.user_id !== user.id) {
    return NextResponse.json(
      { error: "This phone is already linked to another Marco account." },
      { status: 409 }
    );
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

  // Upsert (unique on user_id+phone) so retrying overwrites the prior code.
  const { error: upsertErr } = await admin
    .from("phone_verifications")
    .upsert(
      { user_id: user.id, phone, code, expires_at: expiresAt, attempts: 0 },
      { onConflict: "user_id,phone" }
    );
  if (upsertErr) {
    return NextResponse.json({ error: "Failed to start verification" }, { status: 500 });
  }

  if (smsConfigured()) {
    try {
      await sendSms(phone, `Your Marco verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`);
    } catch (err) {
      console.error("[phone/start] sendSms failed:", err);
      return NextResponse.json({ error: "Failed to send SMS" }, { status: 502 });
    }
  } else {
    // Dev mode without Twilio configured — return the code so it can be tested
    // locally. Never do this when SMS is configured.
    console.warn("[phone/start] Twilio not configured — returning code in response for dev");
    return NextResponse.json({ ok: true, devCode: code });
  }

  return NextResponse.json({ ok: true });
}
