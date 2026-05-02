"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
        <span className="marco-signature" style={{ fontSize: "3rem" }}>marco</span>
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
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink, #1C1A17)" }}>
              Password
            </label>
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
