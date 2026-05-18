"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
            All set
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft, #4A4742)" }}>
            New password saved. Taking you back to sign in.
          </p>
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
          Set a new password.
        </h2>

        {!hasRecoverySession && (
          <p className="text-sm mb-6" style={{ color: "var(--ink-soft, #4A4742)" }}>
            Open this page from the reset link in your email.{" "}
            <Link href="/auth/reset-password" className="font-semibold hover:underline" style={{ color: "var(--tomato, #E5462E)" }}>
              Send a new link
            </Link>
          </p>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink, #1C1A17)" }}>
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              disabled={!hasRecoverySession}
              className="w-full px-4 py-3 rounded-2xl focus:ring-2 outline-none text-sm bg-white disabled:opacity-50"
              style={{ border: "1px solid rgba(28,26,23,0.12)", color: "var(--ink, #1C1A17)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tomato, #E5462E)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(28,26,23,0.12)")}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--ink, #1C1A17)" }}>
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={!hasRecoverySession}
              className="w-full px-4 py-3 rounded-2xl focus:ring-2 outline-none text-sm bg-white disabled:opacity-50"
              style={{ border: "1px solid rgba(28,26,23,0.12)", color: "var(--ink, #1C1A17)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tomato, #E5462E)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(28,26,23,0.12)")}
              placeholder="Type it again"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !hasRecoverySession}
            className="w-full py-3.5 px-4 text-white rounded-2xl disabled:opacity-50 font-medium text-sm shadow-sm transition-colors hover:opacity-95"
            style={{ background: "var(--ink, #1C1A17)" }}
          >
            {loading ? "Saving..." : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
