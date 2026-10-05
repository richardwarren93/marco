"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";
import {
  INK, TOMATO, BUTTER, DISP, SANS,
  AuthShell, Wordmark, Squiggle, MascotCard,
  inkBtn, tomatoBtn, inputStyle,
} from "@/components/auth/AuthChrome";

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password/confirm`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <MascotCard size={118} bg={BUTTER} />
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, color: INK, marginTop: 22 }}>Check your email!</h1>
          <Squiggle w={170} />
          <p style={{ fontFamily: SANS, fontSize: 15, color: "#4A4742", marginTop: 14, lineHeight: 1.5, maxWidth: 320 }}>
            We sent a reset link to <b style={{ color: INK }}>{email}</b>. Tap it on this device to set a new password.
          </p>
          <Link href="/auth/login" className="inline-block active:scale-[0.98] transition-transform" style={{ ...tomatoBtn, padding: "14px 26px", marginTop: 24 }}>Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="flex justify-center" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 22px)" }}><Wordmark size={24} /></div>

      <div className="flex-1 w-full mx-auto px-6" style={{ maxWidth: 400, paddingTop: 28 }}>
        <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: INK, lineHeight: 1.04 }}>Forgot your password?</h1>
        <Squiggle w={150} />
        <p style={{ fontFamily: SANS, fontSize: 14.5, color: "#4A4742", marginTop: 12, lineHeight: 1.5 }}>Drop in your email and we&apos;ll send you a link to set a new one.</p>

        <form onSubmit={handleRequest} className="space-y-4" style={{ marginTop: 22 }}>
          {error && <div role="alert" style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 12, padding: 12, color: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 14, boxShadow: `3px 3px 0 ${INK}`, transform: "rotate(-0.4deg)" }}>{error}</div>}

          <label className="block" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@example.com" className="block w-full" style={inputStyle} />
          </label>

          <button type="submit" disabled={loading} className="w-full active:scale-[0.98] transition-transform disabled:opacity-50" style={inkBtn}>{loading ? "Sending…" : "Send reset link →"}</button>
        </form>

        <p className="text-center" style={{ fontFamily: SANS, fontSize: 14, color: "#675B4E", marginTop: 22 }}>
          Remembered it? <Link href="/auth/login" style={{ fontWeight: 700, color: TOMATO }}>Back to sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
