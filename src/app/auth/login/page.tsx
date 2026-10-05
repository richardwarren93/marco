"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { signInWithApple } from "@/lib/appleAuth";
import {
  INK, TOMATO, LIME, DISP, HAND, SANS,
  AuthShell, Wordmark, Squiggle, Highlight, MascotCard,
  inkBtn, paperBtn, inputStyle,
} from "@/components/auth/AuthChrome";

// Apple Sign in is required by App Store guideline 4.8 whenever any
// third-party social sign-in is offered. The Apple OAuth provider must
// be configured in the Supabase dashboard (Services ID, Team ID, Key ID,
// private key) before the button can complete a real sign-in.
const APPLE_ENABLED = true;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleAppleSignIn() {
    setError("");
    setLoading(true);
    const result = await signInWithApple(supabase);
    // Web fallback redirects the page away — nothing more to do here.
    if (result.usedWebFallback) return;
    if (!result.ok) {
      if (result.error) setError(result.error); // empty = user cancelled
      setLoading(false);
      return;
    }
    // Native sign-in succeeded — route by onboarding status.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();
      if (profile?.onboarding_completed) {
        document.cookie = "marco_onboarded=1; path=/; max-age=31536000; SameSite=Lax";
      }
    }
    router.push("/onboarding"); // Setup forwards returning users to Table.
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Check if onboarding is completed and set cookie for middleware
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .single();
        if (profile?.onboarding_completed) {
          document.cookie = "marco_onboarded=1; path=/; max-age=31536000; SameSite=Lax";
        }
      }
      router.push("/onboarding"); // Check setup before entering the app.
      router.refresh();
    }
  }

  return (
    <AuthShell>
      <div className="flex justify-center" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 22px)" }}><Wordmark size={24} /></div>

      <div className="flex-1 w-full mx-auto px-6" style={{ maxWidth: 400, paddingTop: 26 }}>
        <div className="flex items-center gap-3">
          <MascotCard size={74} bg={LIME} rot={-6} />
          <div>
            <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, color: INK, lineHeight: 1.0 }}>Welcome <Highlight color={LIME}>back</Highlight></h1>
            <Squiggle w={150} />
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" style={{ marginTop: 26 }}>
          {error && <div role="alert" style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 12, padding: 12, color: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 14, boxShadow: `3px 3px 0 ${INK}`, transform: "rotate(-0.4deg)" }}>{error}</div>}

          <label className="block" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@example.com" className="block w-full" style={inputStyle} />
          </label>

          <div>
            <div className="flex items-baseline justify-between">
              <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>Password</span>
              <Link href="/auth/reset-password" style={{ fontFamily: HAND, fontSize: 15, color: TOMATO }}>forgot it?</Link>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="block w-full" style={inputStyle} />
          </div>

          <button type="submit" disabled={loading} className="w-full active:scale-[0.98] transition-transform disabled:opacity-50" style={inkBtn}>{loading ? "Signing in…" : "Sign in →"}</button>
        </form>

        {APPLE_ENABLED && (
          <>
            <div className="flex items-center gap-3" style={{ margin: "20px 0" }}>
              <div className="flex-1" style={{ height: 2.5, background: "rgba(23,20,16,0.16)" }} />
              <span style={{ fontFamily: HAND, fontSize: 15, color: "rgba(23,20,16,0.5)" }}>or</span>
              <div className="flex-1" style={{ height: 2.5, background: "rgba(23,20,16,0.16)" }} />
            </div>
            <button type="button" onClick={handleAppleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50" style={paperBtn}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={INK}>
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Sign in with Apple
            </button>
          </>
        )}

        <p className="text-center" style={{ fontFamily: SANS, fontSize: 14, color: "#675B4E", marginTop: 22 }}>
          Don&apos;t have an account? <Link href="/auth/signup" style={{ fontWeight: 700, color: TOMATO }}>Sign up</Link>
        </p>
      </div>
    </AuthShell>
  );
}
