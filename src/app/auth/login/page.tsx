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
    <div className="min-h-screen flex flex-col" style={{ background: "#faf9f7" }}>
      {/* Compact hero */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 flex items-center justify-center overflow-hidden">
          <div className="text-center">
            <span className="text-6xl block mb-1">🧑‍🍳</span>
            <h1 className="text-2xl font-black text-white drop-shadow-sm">Marco</h1>
          </div>
          <span className="absolute top-6 left-6 text-3xl opacity-60 rotate-[-15deg]">🍅</span>
          <span className="absolute top-10 right-8 text-2xl opacity-50 rotate-[20deg]">🌿</span>
          <span className="absolute bottom-8 left-12 text-2xl opacity-50 rotate-[10deg]">🍋</span>
          <span className="absolute bottom-6 right-10 text-3xl opacity-60 rotate-[-10deg]">🥑</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-8 pb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Welcome back</h2>

        <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full px-4 py-3 border border-[#e8ddd3] rounded-2xl focus:ring-2 focus:ring-orange-300 focus:border-transparent outline-none text-sm bg-white"
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
              className="w-full px-4 py-3 border border-[#e8ddd3] rounded-2xl focus:ring-2 focus:ring-orange-300 focus:border-transparent outline-none text-sm bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#1a1410] text-white rounded-2xl hover:bg-[#2c2420] disabled:opacity-50 font-semibold text-sm shadow-sm transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-orange-600 hover:underline font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
