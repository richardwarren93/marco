"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleGuestSignIn() {
    if (!agreedToTerms) {
      setError("Please agree to the Terms and Privacy Policy");
      return;
    }
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

  const GOOGLE_ENABLED = false;
  const APPLE_ENABLED = false;

  async function handleOAuth(provider: "google" | "apple") {
    if (!agreedToTerms) {
      setError("Please agree to the Terms and Privacy Policy");
      return;
    }
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#faf9f7" }}>
        <div className="text-center space-y-4 max-w-sm">
          <span className="text-6xl block">📬</span>
          <h1 className="text-2xl font-black text-gray-900">Check your email!</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            We sent a confirmation link to <strong className="text-gray-700">{email}</strong>
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-4 px-6 py-3 bg-orange-500 text-white rounded-2xl font-semibold text-sm hover:bg-orange-600 transition-colors shadow-sm"
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
          <button
            onClick={() => { setMode("choose"); setError(""); }}
            className="absolute top-12 left-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 px-6 pt-8 pb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Create your account</h2>

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
                minLength={6}
                className="w-full px-4 py-3 border border-[#e8ddd3] rounded-2xl focus:ring-2 focus:ring-orange-300 focus:border-transparent outline-none text-sm bg-white"
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#1a1410] text-white rounded-2xl hover:bg-[#2c2420] disabled:opacity-50 font-semibold text-sm shadow-sm transition-colors"
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

  // Main choose screen
  return (
    <div className="flex flex-col" style={{ background: "#faf9f7", minHeight: "100dvh" }}>
      {/* Hero illustration area */}
      <div className="relative flex-1 bg-gradient-to-b from-[#fff4e8] via-[#fdf5ec] to-[#faf9f7] flex flex-col items-center justify-center overflow-hidden py-6">
        <div className="absolute inset-0 opacity-[0.07]">
          <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
            <circle cx="50" cy="60" r="30" fill="currentColor" className="text-orange-500" />
            <circle cx="350" cy="90" r="20" fill="currentColor" className="text-green-500" />
            <circle cx="80" cy="300" r="22" fill="currentColor" className="text-green-500" />
            <circle cx="300" cy="250" r="25" fill="currentColor" className="text-yellow-500" />
            <circle cx="350" cy="350" r="16" fill="currentColor" className="text-red-500" />
          </svg>
        </div>

        <div className="relative z-10 text-center px-8">
          <div className="relative w-48 h-48 mx-auto mb-3">
            <div className="absolute inset-3 rounded-full border-2 border-dashed border-orange-200/60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-7xl drop-shadow-sm">🧑‍🍳</span>
            </div>
            <span className="absolute top-0 left-1/2 -translate-x-1/2 text-3xl animate-bounce" style={{ animationDuration: "3s" }}>🍅</span>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-3xl animate-bounce" style={{ animationDuration: "3.5s" }}>🧀</span>
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl animate-bounce" style={{ animationDuration: "2.8s" }}>🥑</span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-3xl animate-bounce" style={{ animationDuration: "3.2s" }}>🍋</span>
            <span className="absolute top-5 left-2 text-2xl animate-bounce" style={{ animationDuration: "3.7s" }}>🌿</span>
            <span className="absolute top-5 right-2 text-2xl animate-bounce" style={{ animationDuration: "2.5s" }}>🫑</span>
            <span className="absolute bottom-5 left-3 text-2xl animate-bounce" style={{ animationDuration: "3.3s" }}>🍊</span>
            <span className="absolute bottom-5 right-3 text-2xl animate-bounce" style={{ animationDuration: "2.9s" }}>🥕</span>
          </div>

          <h1 className="text-3xl font-black text-gray-900 mb-4">Marco</h1>

          {/* Value props */}
          <div className="space-y-0.5">
            <p className="text-[15px] font-bold" style={{ color: "#1a1410" }}>
              Save recipes from <span style={{ color: "#ea580c" }}>anywhere</span>
            </p>
            <p className="text-[15px] font-bold" style={{ color: "#1a1410" }}>
              Plan meals in <span style={{ color: "#ea580c" }}>seconds</span>
            </p>
            <p className="text-[15px] font-bold" style={{ color: "#1a1410" }}>
              Shop and <span style={{ color: "#ea580c" }}>earn back</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom action area */}
      <div className="px-6 pb-8 pt-4 space-y-3 flex-shrink-0">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center">{error}</div>
        )}

        {/* Terms checkbox */}
        <div className="flex items-start gap-3 pb-1">
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
            <span className="underline text-gray-700 font-medium">Terms</span>
            {" "}and{" "}
            <span className="underline text-gray-700 font-medium">Privacy Policy</span>
          </p>
        </div>

        {/* Continue with Email */}
        <button
          onClick={() => {
            if (!agreedToTerms) {
              setError("Please agree to the Terms and Privacy Policy");
              return;
            }
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
