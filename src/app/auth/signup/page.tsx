"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WelcomePhoneMockup from "@/components/onboarding/WelcomePhoneMockup";

// Rotating welcome headline — synced with the phone screens (recipe / meal plan
// / grocery). Each phrase's accent word renders in tomato italic.
const HERO_PHRASES = [
  { lead: "Save & organize recipes from ", accent: "anywhere" },
  { lead: "Create a meal plan ", accent: "automatically" },
  { lead: "Generate your ", accent: "grocery list" },
];

export default function SignupPage() {
  const [mode, setMode] = useState<"welcome" | "choose" | "email">("welcome");
  const [heroScreen, setHeroScreen] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Advance the welcome hero (headline + phone) every few seconds.
  useEffect(() => {
    if (mode !== "welcome") return;
    const id = setInterval(() => setHeroScreen((s) => (s + 1) % HERO_PHRASES.length), 3800);
    return () => clearInterval(id);
  }, [mode]);

  async function handleGuestSignIn() {
    setError("");
    setGuestLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setError(error.message);
      setGuestLoading(false);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedToTerms) {
      setError("Please agree to the Terms and Privacy Policy");
      return;
    }
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user && data.user.identities?.length === 0) {
      // Email already exists — Supabase returns empty identities
      setError("This email already has an account. Please sign in instead.");
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  // Apple Sign in is required by App Store guideline 4.8 whenever any
  // third-party social sign-in is offered. We enable Apple here so the
  // option is in place; the Supabase Auth provider config (Services ID,
  // Team ID, Key ID, private key) must be filled in via the Supabase
  // dashboard before the button can complete a real sign-in. Google
  // stays disabled until we wire its provider config too.
  const GOOGLE_ENABLED = false;
  const APPLE_ENABLED = true;

  async function handleOAuth(provider: "google" | "apple") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  // Success confirmation
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#F5EEE2" }}>
        <div className="text-center space-y-4 max-w-sm">
          <span className="marco-signature block" style={{ fontSize: "4rem" }}>salt & spoon</span>
          <h1
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
              fontSize: "26px",
              letterSpacing: "-0.015em",
              color: "var(--ink, #1C1A17)",
            }}
          >
            Check your email
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft, #4A4742)" }}>
            We sent a confirmation link to <strong style={{ color: "var(--ink, #1C1A17)" }}>{email}</strong>
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-4 px-6 py-3 text-white rounded-2xl font-medium text-sm transition-colors shadow-sm hover:opacity-95"
            style={{ background: "var(--tomato, #E5462E)" }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Email + password form
  if (mode === "email") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#F5EEE2" }}>
        {/* Header — back arrow + small Marco signature, no orange hero band */}
        <div className="relative flex items-center justify-between px-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)", paddingBottom: "1rem" }}>
          <button
            onClick={() => { setMode("choose"); setError(""); }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(0,0,0,0.05)" }}
            aria-label="Back"
          >
            <svg className="w-4 h-4" style={{ color: "#1C1A17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="marco-signature" style={{ fontSize: "1.75rem" }}>salt & spoon</span>
          <div className="w-9 h-9" aria-hidden="true" />
        </div>

        {/* Form */}
        <div className="flex-1 px-6 pt-6 pb-10 max-w-sm mx-auto w-full">
          <h2
            className="mb-6"
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
              fontSize: "26px",
              letterSpacing: "-0.015em",
              color: "var(--ink, #1C1A17)",
            }}
          >
            Create your account
          </h2>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-2xl focus:ring-2 outline-none text-sm bg-white"
                style={{ border: "1px solid rgba(28,26,23,0.12)", color: "var(--ink, #1C1A17)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tomato, #E5462E)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(28,26,23,0.12)")}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-2xl focus:ring-2 outline-none text-sm bg-white"
                style={{ border: "1px solid rgba(28,26,23,0.12)", color: "var(--ink, #1C1A17)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tomato, #E5462E)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(28,26,23,0.12)")}
                placeholder="At least 6 characters"
              />
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setAgreedToTerms(!agreedToTerms); setError(""); }}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  agreedToTerms
                    ? "bg-orange-500 border-orange-500"
                    : "border-gray-300 bg-white"
                }`}
                aria-label="Agree to terms"
              >
                {agreedToTerms && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <p className="text-xs text-gray-500 leading-relaxed">
                I&apos;ve read and agree with the{" "}
                <Link href="/terms" target="_blank" className="underline text-gray-700 font-medium">Terms</Link>
                {" "}and{" "}
                <Link href="/privacy" target="_blank" className="underline text-gray-700 font-medium">Privacy Policy</Link>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#1C1A17] text-white rounded-2xl hover:bg-[#2c2420] disabled:opacity-50 font-semibold text-sm shadow-sm transition-colors"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-orange-600 hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Welcome screen — ReciMe-style landing: wordmark logo, headline, an
  // animated phone mockup showing a recipe importing "in seconds", then a
  // single Get started CTA that opens the sign-in method picker.
  if (mode === "welcome") {
    return (
      <div
        className="flex flex-col"
        style={{ background: "#F5EEE2", minHeight: "100dvh" }}
      >
        {/* Header — wordmark logo + headline + subtitle */}
        <div
          className="flex flex-col items-center text-center px-6 flex-shrink-0"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.75rem)" }}
        >
          <span
            className="marco-signature animate-stagger-in"
            style={{ fontSize: "2.5rem" }}
          >
            salt &amp; spoon
          </span>

          <h1
            key={heroScreen}
            className="mt-5 max-w-sm animate-stagger-in"
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
              fontSize: "27px",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--ink, #1C1A17)",
              minHeight: "2.2em",
            }}
          >
            {HERO_PHRASES[heroScreen].lead}
            <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>
              {HERO_PHRASES[heroScreen].accent}
            </em>
          </h1>
        </div>

        {/* Animated phone mockup — fills the space between header and CTA */}
        <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-6 overflow-hidden">
          <div
            className="animate-stagger-in"
            style={{ height: "min(440px, 56vh)", animationDelay: "0.22s" }}
          >
            <WelcomePhoneMockup screen={heroScreen} />
          </div>
        </div>

        {/* Bottom action — single Get started CTA + sign in link */}
        <div className="px-6 pb-8 pt-2 flex-shrink-0 max-w-sm mx-auto w-full">
          <button
            onClick={() => {
              setError("");
              setMode("choose");
            }}
            className="w-full py-4 px-4 text-white rounded-2xl font-semibold text-base shadow-sm transition-colors"
            style={{ background: "var(--tomato, #E5462E)" }}
            onMouseDown={(e) =>
              (e.currentTarget.style.background = "var(--tomato-dark, #B8331E)")
            }
            onMouseUp={(e) =>
              (e.currentTarget.style.background = "var(--tomato, #E5462E)")
            }
          >
            Get started
          </button>

          <p className="text-center text-sm text-gray-500 pt-4">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-orange-600 hover:underline font-semibold"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Sign-in method picker — reached via Get started
  return (
    <div className="flex flex-col sm:justify-center" style={{ background: "#F5EEE2", minHeight: "100dvh" }}>
      {/* Back to welcome */}
      <div
        className="flex items-center px-4 flex-shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <button
          onClick={() => { setMode("welcome"); setError(""); }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "rgba(0,0,0,0.05)" }}
          aria-label="Back"
        >
          <svg className="w-4 h-4" style={{ color: "#1C1A17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      {/* Hero — Marco signature wordmark + italic tagline. No emoji,
          no chef glyph circle, no orange hero band. The cream body is
          the canvas; the wordmark is the brand.
          On mobile the hero grows (flex-1) so buttons pin to the bottom
          for thumb reachability. On desktop we drop the growth so the
          buttons sit right under the tagline. */}
      <div className="relative flex-1 sm:flex-none flex flex-col items-center justify-center overflow-hidden px-6 pt-6 pb-6">
        <div className="relative z-10 text-center">
          <span className="marco-signature" style={{ fontSize: "clamp(3rem, 11vw, 4rem)" }}>salt & spoon</span>

          <p
            className="mt-6 max-w-xs mx-auto"
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontVariationSettings: '"opsz" 40, "SOFT" 100, "wght" 500',
              fontSize: "20px",
              lineHeight: 1.25,
              letterSpacing: "-0.01em",
              color: "var(--ink, #1C1A17)",
            }}
          >
            Let&apos;s get you <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>cooking</em>
          </p>
        </div>
      </div>

      {/* Bottom action area */}
      <div className="px-6 pb-8 pt-4 space-y-3 flex-shrink-0 max-w-sm mx-auto w-full">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center">{error}</div>
        )}

        {/* Continue with Email */}
        <button
          onClick={() => {
            setError("");
            setMode("email");
          }}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-gray-900 text-white rounded-2xl font-semibold text-sm shadow-sm hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Continue with Email
        </button>

        {/* Continue with Google */}
        {GOOGLE_ENABLED && (
          <button
            onClick={() => handleOAuth("google")}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        )}

        {/* Continue with Apple */}
        {APPLE_ENABLED && (
          <button
            onClick={() => handleOAuth("apple")}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>
        )}

        {/* Continue as guest */}
        <button
          onClick={handleGuestSignIn}
          disabled={guestLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-gray-200 rounded-2xl font-semibold text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          {guestLoading ? "Signing in..." : "Continue as guest"}
        </button>

        {/* Sign in link */}
        <p className="text-center text-sm text-gray-500 pt-1">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-orange-600 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
