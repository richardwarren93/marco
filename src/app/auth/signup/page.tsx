"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithApple } from "@/lib/appleAuth";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import {
  INK, PAPER, TOMATO, LIME, BUTTER, DISP, HAND, SANS,
  AuthShell, Wordmark, Squiggle, Sticker, Highlight, MascotCard,
  inkBtn, tomatoBtn, paperBtn, inputStyle,
} from "@/components/auth/AuthChrome";

export default function SignupPage() {
  const [mode, setMode] = useState<"welcome" | "tour" | "choose" | "email">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedToTerms) { setError("Please agree to the Terms and Privacy Policy"); return; }
    setError(""); setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (error) { setError(error.message); setLoading(false); }
    else if (data.user && data.user.identities?.length === 0) { setError("This email already has an account. Please sign in instead."); setLoading(false); }
    else if (data.session) { router.push("/onboarding"); router.refresh(); }
    else { setSuccess(true); setLoading(false); }
  }

  // Native Sign in with Apple (iOS) with a web-OAuth fallback.
  async function handleAppleSignIn() {
    setError(""); setLoading(true);
    const result = await signInWithApple(supabase);
    if (result.usedWebFallback) return;
    if (!result.ok) { if (result.error) setError(result.error); setLoading(false); return; }
    router.push("/onboarding"); router.refresh();
  }

  const Back = ({ to }: { to: "welcome" | "choose" }) => (
    <button onClick={() => { setMode(to); setError(""); }} aria-label="Back" style={{ fontFamily: HAND, fontSize: 17, color: INK, background: "none", border: "none" }}>‹ back</button>
  );
  const ErrorNote = () => error ? (
    <div role="alert" style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 12, padding: 12, color: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 14, boxShadow: `3px 3px 0 ${INK}`, transform: "rotate(-0.4deg)" }}>{error}</div>
  ) : null;

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthShell>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <MascotCard size={118} bg={BUTTER} />
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, color: INK, marginTop: 22 }}>Check your email!</h1>
          <Squiggle w={170} />
          <p style={{ fontFamily: SANS, fontSize: 15, color: "#4A4742", marginTop: 14, lineHeight: 1.5, maxWidth: 320 }}>We sent a confirmation link to <b style={{ color: INK }}>{email}</b></p>
          <Link href="/auth/login" className="inline-block active:scale-[0.98] transition-transform" style={{ ...tomatoBtn, padding: "14px 26px", marginTop: 24 }}>Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  // ── Value tour (real app screens, before we ask for a sign-in) ───────────────
  if (mode === "tour") {
    return <OnboardingTour onDone={() => { setError(""); setMode("choose"); }} />;
  }

  // ── Email form ───────────────────────────────────────────────────────────────
  if (mode === "email") {
    return (
      <AuthShell>
        <div className="flex items-center justify-between px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 18px)" }}>
          <Back to="choose" /><Wordmark size={20} /><span style={{ width: 44 }} />
        </div>
        <div className="flex-1 w-full mx-auto px-6" style={{ maxWidth: 400, paddingTop: 22 }}>
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, color: INK }}>Make your <Highlight color={LIME}>account</Highlight></h1>
          <Squiggle w={160} />
          <form onSubmit={handleSignup} className="space-y-4" style={{ marginTop: 24 }}>
            <ErrorNote />
            <label className="block" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@example.com" className="block w-full" style={inputStyle} />
            </label>
            <label className="block" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="at least 6 characters" className="block w-full" style={inputStyle} />
            </label>
            <div className="flex items-start gap-3 pt-1">
              <button type="button" onClick={() => { setAgreedToTerms(!agreedToTerms); setError(""); }} aria-label="Agree to terms" className="flex items-center justify-center flex-shrink-0" style={{ width: 24, height: 24, borderRadius: 7, border: `2.5px solid ${INK}`, background: agreedToTerms ? LIME : "#fff", marginTop: 1, boxShadow: `2px 2px 0 ${INK}` }}>
                {agreedToTerms && <svg className="w-3.5 h-3.5" style={{ color: INK }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
              <p style={{ fontFamily: SANS, fontSize: 12.5, color: "#675B4E", lineHeight: 1.4 }}>I&apos;ve read and agree with the <Link href="/terms" target="_blank" style={{ fontWeight: 700, color: INK, textDecoration: "underline" }}>Terms</Link> and <Link href="/privacy" target="_blank" style={{ fontWeight: 700, color: INK, textDecoration: "underline" }}>Privacy Policy</Link></p>
            </div>
            <button type="submit" disabled={loading} className="w-full active:scale-[0.98] transition-transform disabled:opacity-50" style={inkBtn}>{loading ? "Creating account…" : "Create account →"}</button>
          </form>
          <p className="text-center" style={{ fontFamily: SANS, fontSize: 14, color: "#675B4E", marginTop: 20 }}>Already have an account? <Link href="/auth/login" style={{ fontWeight: 700, color: TOMATO }}>Sign in</Link></p>
        </div>
      </AuthShell>
    );
  }

  // ── Auth picker ──────────────────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <AuthShell>
        <div className="flex items-center px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 18px)" }}><Back to="welcome" /></div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <MascotCard size={118} rot={-5} />
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 34, color: INK, marginTop: 22, lineHeight: 1.02 }}>Let&apos;s get <Highlight color={BUTTER}>cooking</Highlight></h1>
          <Squiggle w={170} />
        </div>
        <div className="w-full mx-auto px-6 space-y-3" style={{ maxWidth: 400, paddingBottom: 34 }}>
          <ErrorNote />
          <button onClick={() => { setError(""); setMode("email"); }} className="w-full active:scale-[0.98] transition-transform" style={inkBtn}>Continue with Email</button>
          <button onClick={handleAppleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50" style={paperBtn}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={INK}><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
            Continue with Apple
          </button>
          <p className="text-center" style={{ fontFamily: SANS, fontSize: 14, color: "#675B4E", paddingTop: 2 }}>Already have an account? <Link href="/auth/login" style={{ fontWeight: 700, color: TOMATO }}>Sign in</Link></p>
        </div>
      </AuthShell>
    );
  }

  // ── Welcome — the loud, zany landing ─────────────────────────────────────────
  return (
    <AuthShell density="full">
      <div className="flex justify-center" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 22px)" }}><Wordmark size={26} /></div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative" style={{ marginBottom: 6 }}>
          <MascotCard size={150} rot={-4} />
          {/* handwritten callout + doodle arrow pointing at the tomato */}
          <span style={{ position: "absolute", top: -6, right: -96, fontFamily: HAND, fontWeight: 700, fontSize: 18, color: INK, transform: "rotate(6deg)", width: 92, textAlign: "left", lineHeight: 1.05 }}>your kitchen buddy</span>
          <svg aria-hidden width="60" height="46" viewBox="0 0 60 46" fill="none" style={{ position: "absolute", top: 20, right: -30 }}>
            <path d="M56 6 C 40 2, 16 10, 6 34" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M6 34 l10 -4 M6 34 l3 -11" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </div>
        <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 42, lineHeight: 1.03, letterSpacing: "-0.01em", color: INK, marginTop: 30, maxWidth: 360 }}>
          The recipe app that <Highlight color={LIME}>actually cooks</Highlight>
        </h1>
        <div style={{ position: "relative", marginTop: 26 }}>
          <Sticker bg={TOMATO} color={PAPER} font={HAND} size={16} rot={-2} style={{ position: "static", display: "inline-block" }}>save it · plan it · cook it 🍅</Sticker>
          <div style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.7, marginTop: 10 }}>…with your people</div>
        </div>
      </div>
      <div className="w-full mx-auto px-6" style={{ maxWidth: 400, paddingBottom: 36 }}>
        <button onClick={() => { setError(""); setMode("tour"); }} className="w-full active:scale-[0.98] transition-transform" style={tomatoBtn}>Get started →</button>
        <Link href="/auth/login" className="block text-center" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, paddingTop: 18 }}>I already have an account</Link>
      </div>
    </AuthShell>
  );
}
