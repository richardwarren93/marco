"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";

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
            We sent a reset link to <strong style={{ color: "var(--ink, #1C1A17)" }}>{email}</strong>.
            Tap it on this device to set a new password.
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5EEE2" }}>
      <div
        className="relative flex items-center justify-center px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)", paddingBottom: "1.5rem" }}
      >
        <span className="marco-signature" style={{ fontSize: "3rem" }}>salt & spoon</span>
      </div>

      <div className="flex-1 px-6 pt-4 pb-10 max-w-sm mx-auto w-full">
        <h2
          className="mb-2"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "20px",
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          Forgot your password?
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--ink-soft, #4A4742)" }}>
          Drop in your email and we&apos;ll send you a link to set a new one.
        </p>

        <form onSubmit={handleRequest} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 text-white rounded-2xl disabled:opacity-50 font-medium text-sm shadow-sm transition-colors hover:opacity-95"
            style={{ background: "var(--ink, #1C1A17)" }}
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--ink-soft, #4A4742)" }}>
          Remembered it?{" "}
          <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: "var(--tomato, #E5462E)" }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
