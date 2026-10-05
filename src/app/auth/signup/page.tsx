"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithApple } from "@/lib/appleAuth";
import OnboardingTour from "@/components/onboarding/OnboardingTour";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";

const dotted: React.CSSProperties = { background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" };
const inkBtn: React.CSSProperties = { background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "15px 0", borderRadius: 14, border: `2.5px solid ${INK}` };
const tomatoBtn: React.CSSProperties = { background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "16px 0", borderRadius: 14, border: `2.5px solid ${INK}`, boxShadow: "0 8px 18px rgba(229,70,46,0.3)" };
const paperBtn: React.CSSProperties = { background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "14px 0", borderRadius: 14, border: `2px solid ${INK}` };

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

  const Wordmark = ({ size = 22 }: { size?: number }) => <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: size, color: INK, letterSpacing: "-0.02em" }}>Marco</span>;
  const Back = ({ to }: { to: "welcome" | "choose" }) => (
    <button onClick={() => { setMode(to); setError(""); }} aria-label="Back" style={{ fontFamily: HAND, fontSize: 16, color: INK, background: "none", border: "none" }}>‹ back</button>
  );

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center px-6" style={dotted}>
        <div className="text-center" style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 72 }} aria-hidden>🍅</div>
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: INK, marginTop: 8 }}>Check your email</h1>
          <p style={{ fontFamily: SANS, fontSize: 15, color: "#4A4742", marginTop: 10, lineHeight: 1.5 }}>We sent a confirmation link to <b style={{ color: INK }}>{email}</b></p>
          <Link href="/auth/login" className="inline-block active:scale-[0.98] transition-transform" style={{ ...tomatoBtn, padding: "13px 22px", marginTop: 20 }}>Back to sign in</Link>
        </div>
      </div>
    );
  }

  // ── Email form ───────────────────────────────────────────────────────────────
  if (mode === "email") {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col" style={dotted}>
        <div className="flex items-center justify-between px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)" }}>
          <Back to="choose" /><Wordmark size={20} /><span style={{ width: 40 }} />
        </div>
        <div className="flex-1 w-full mx-auto px-6" style={{ maxWidth: 400, paddingTop: 20 }}>
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: INK }}>Create your account</h1>
          <svg width="150" height="11" viewBox="0 0 150 11" fill="none" aria-hidden className="block" style={{ marginTop: 2 }}><path d="M2 7 C 26 2, 50 10, 76 6 S 128 2, 148 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>
          <form onSubmit={handleSignup} className="space-y-4" style={{ marginTop: 24 }}>
            {error && <div role="alert" style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: 12, color: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 14 }}>{error}</div>}
            <label className="block" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@example.com" className="block w-full" style={{ marginTop: 6, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 14px", fontFamily: SANS, fontSize: 16, color: INK }} />
            </label>
            <label className="block" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="at least 6 characters" className="block w-full" style={{ marginTop: 6, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 14px", fontFamily: SANS, fontSize: 16, color: INK }} />
            </label>
            <div className="flex items-start gap-3 pt-1">
              <button type="button" onClick={() => { setAgreedToTerms(!agreedToTerms); setError(""); }} aria-label="Agree to terms" className="flex items-center justify-center flex-shrink-0" style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${INK}`, background: agreedToTerms ? LIME : PAPER, marginTop: 1 }}>
                {agreedToTerms && <svg className="w-3 h-3" style={{ color: INK }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
              <p style={{ fontFamily: SANS, fontSize: 12.5, color: "#675B4E", lineHeight: 1.4 }}>I&apos;ve read and agree with the <Link href="/terms" target="_blank" style={{ fontWeight: 700, color: INK, textDecoration: "underline" }}>Terms</Link> and <Link href="/privacy" target="_blank" style={{ fontWeight: 700, color: INK, textDecoration: "underline" }}>Privacy Policy</Link></p>
            </div>
            <button type="submit" disabled={loading} className="w-full active:scale-[0.98] transition-transform disabled:opacity-50" style={inkBtn}>{loading ? "Creating account…" : "Create account →"}</button>
          </form>
          <p className="text-center" style={{ fontFamily: SANS, fontSize: 14, color: "#675B4E", marginTop: 20 }}>Already have an account? <Link href="/auth/login" style={{ fontWeight: 700, color: TOMATO }}>Sign in</Link></p>
        </div>
      </div>
    );
  }

  // ── Value tour (real app screens, before we ask for a sign-in) ───────────────
  if (mode === "tour") {
    return <OnboardingTour onDone={() => { setError(""); setMode("choose"); }} />;
  }

  // ── Auth picker ──────────────────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col" style={dotted}>
        <div className="flex items-center px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)" }}><Back to="welcome" /></div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div style={{ fontSize: 64 }} aria-hidden>🍅</div>
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 34, color: INK, marginTop: 8 }}>Let&apos;s get cooking</h1>
          <svg width="160" height="11" viewBox="0 0 160 11" fill="none" aria-hidden style={{ marginTop: 2 }}><path d="M2 7 C 28 2, 54 10, 82 6 S 140 2, 158 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>
        </div>
        <div className="w-full mx-auto px-6 space-y-3" style={{ maxWidth: 400, paddingBottom: 32 }}>
          {error && <div role="alert" style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: 12, color: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 14, textAlign: "center" }}>{error}</div>}
          <button onClick={() => { setError(""); setMode("email"); }} className="w-full active:scale-[0.98] transition-transform" style={inkBtn}>Continue with Email</button>
          <button onClick={handleAppleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50" style={paperBtn}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={INK}><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
            Continue with Apple
          </button>
          <p className="text-center" style={{ fontFamily: SANS, fontSize: 14, color: "#675B4E", paddingTop: 2 }}>Already have an account? <Link href="/auth/login" style={{ fontWeight: 700, color: TOMATO }}>Sign in</Link></p>
        </div>
      </div>
    );
  }

  // ── Welcome (the brand pitch; the full showcase runs next, before sign-in) ───
  return (
    <div className="min-h-[100dvh] w-full flex flex-col" style={dotted}>
      <div className="flex justify-center" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 22px)" }}><Wordmark size={24} /></div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="flex items-center justify-center" style={{ width: 168, height: 168, borderRadius: 40, background: LIME, border: `2.5px solid ${INK}`, boxShadow: "0 18px 40px rgba(23,20,16,0.2)", transform: "rotate(-3deg)" }}>
          <div style={{ fontSize: 92, transform: "rotate(-4deg)" }} aria-hidden>🍅</div>
        </div>
        <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 40, lineHeight: 1.03, letterSpacing: "-0.01em", color: INK, marginTop: 28 }}>The recipe app that actually cooks</h1>
        <p style={{ fontFamily: HAND, fontSize: 19, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 12 }}>save it · plan it · cook it — with your people</p>
      </div>
      <div className="w-full mx-auto px-6" style={{ maxWidth: 400, paddingBottom: 34 }}>
        <button onClick={() => { setError(""); setMode("tour"); }} className="w-full active:scale-[0.98] transition-transform" style={tomatoBtn}>Get started →</button>
        <Link href="/auth/login" className="block text-center" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, paddingTop: 18 }}>I already have an account</Link>
      </div>
    </div>
  );
}
