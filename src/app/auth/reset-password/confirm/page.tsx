"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  INK, TOMATO, LIME, DISP, SANS,
  AuthShell, Wordmark, Squiggle, MascotCard,
  inkBtn, inputStyle,
} from "@/components/auth/AuthChrome";

export default function ResetPasswordConfirmPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // Reading the URL hash on mount triggers Supabase's helper to set the
  // recovery session. Until we see a session we keep the form disabled —
  // otherwise the user could land here without a token and try to set a
  // password against a stale session.
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash on email-link redirect.
    // The browser client picks it up and emits PASSWORD_RECOVERY via onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasRecoverySession(true);
      }
    });
    // Belt-and-suspenders: also check for an existing session in case the
    // event fired before this effect attached.
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) setHasRecoverySession(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setLoading(false);
      // Sign out so the user has to use the new password to come back in.
      await supabase.auth.signOut();
      setTimeout(() => router.push("/auth/login"), 1800);
    }
  }

  if (done) {
    return (
      <AuthShell>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <MascotCard size={118} bg={LIME} />
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, color: INK, marginTop: 22 }}>All set!</h1>
          <Squiggle w={150} />
          <p style={{ fontFamily: SANS, fontSize: 15, color: "#4A4742", marginTop: 14, lineHeight: 1.5, maxWidth: 300 }}>New password saved. Taking you back to sign in.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="flex justify-center" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 22px)" }}><Wordmark size={24} /></div>

      <div className="flex-1 w-full mx-auto px-6" style={{ maxWidth: 400, paddingTop: 28 }}>
        <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: INK, lineHeight: 1.04 }}>Set a new password</h1>
        <Squiggle w={160} />

        {!hasRecoverySession && (
          <p style={{ fontFamily: SANS, fontSize: 14, color: "#4A4742", marginTop: 12, lineHeight: 1.5 }}>
            Open this page from the reset link in your email.{" "}
            <Link href="/auth/reset-password" style={{ fontWeight: 700, color: TOMATO }}>Send a new link</Link>
          </p>
        )}

        <form onSubmit={handleUpdate} className="space-y-4" style={{ marginTop: 22 }}>
          {error && <div role="alert" style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 12, padding: 12, color: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 14, boxShadow: `3px 3px 0 ${INK}`, transform: "rotate(-0.4deg)" }}>{error}</div>}

          <label className="block" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus disabled={!hasRecoverySession} placeholder="at least 8 characters" className="block w-full disabled:opacity-50" style={inputStyle} />
          </label>

          <label className="block" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>Confirm new password
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={!hasRecoverySession} placeholder="type it again" className="block w-full disabled:opacity-50" style={inputStyle} />
          </label>

          <button type="submit" disabled={loading || !hasRecoverySession} className="w-full active:scale-[0.98] transition-transform disabled:opacity-50" style={inkBtn}>{loading ? "Saving…" : "Save new password →"}</button>
        </form>
      </div>
    </AuthShell>
  );
}
