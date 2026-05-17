"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

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

  async function handleOAuth(provider: "apple") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
      router.push("/recipes");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5EEE2" }}>
      {/* Header — Marco signature wordmark instead of orange hero band */}
      <div
        className="relative flex items-center justify-center px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)", paddingBottom: "1.5rem" }}
      >
        <span className="marco-signature" style={{ fontSize: "3rem" }}>salt & spoon</span>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-4 pb-10 max-w-sm mx-auto w-full">
        <h2
          className="mb-6"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "20px",
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          Welcome back.
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink, #1C1A17)" }}>
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
            <div className="flex items-baseline justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium" style={{ color: "var(--ink, #1C1A17)" }}>
                Password
              </label>
              <Link
                href="/auth/reset-password"
                className="text-xs hover:underline"
                style={{ color: "var(--tomato, #E5462E)" }}
              >
                Forgot it?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl focus:ring-2 outline-none text-sm bg-white"
              style={{ border: "1px solid rgba(28,26,23,0.12)", color: "var(--ink, #1C1A17)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tomato, #E5462E)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(28,26,23,0.12)")}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 text-white rounded-2xl disabled:opacity-50 font-medium text-sm shadow-sm transition-colors hover:opacity-95"
            style={{ background: "var(--ink, #1C1A17)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {APPLE_ENABLED && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: "rgba(28,26,23,0.12)" }} />
              <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(28,26,23,0.45)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(28,26,23,0.12)" }} />
            </div>
            <button
              type="button"
              onClick={() => handleOAuth("apple")}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border rounded-2xl font-semibold text-sm shadow-sm hover:bg-gray-50 transition-colors"
              style={{ borderColor: "rgba(28,26,23,0.12)", color: "var(--ink, #1C1A17)" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Sign in with Apple
            </button>
          </>
        )}

        <p className="text-center text-sm mt-6" style={{ color: "var(--ink-soft, #4A4742)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="font-semibold hover:underline" style={{ color: "var(--tomato, #E5462E)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
