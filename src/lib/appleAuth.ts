"use client";

// Native "Sign in with Apple" for the Capacitor iOS shell, with a web-OAuth
// fallback for the browser.
//
// Why this exists: `supabase.auth.signInWithOAuth({ provider: "apple" })` uses a
// browser *redirect* flow. Inside the native WebView that dumps the user onto a
// raw Supabase/Apple URL and never returns cleanly — the "weird" experience, and
// a guaranteed App Review rejection. On device we instead trigger the NATIVE
// Apple sheet (@capgo/capacitor-social-login), get Apple's identity token, and
// hand it to Supabase via `signInWithIdToken`. Same guarded dynamic-import
// pattern the rest of the app uses for Capacitor plugins (see purchases.ts).
//
// Native setup this depends on (see the launch runbook):
//   - "Sign In with Apple" capability enabled on App ID com.ACGC.crave
//   - `com.apple.developer.applesignin` in ios/App/App/App.entitlements
//   - Supabase → Auth → Apple provider enabled, with com.ACGC.crave in the
//     Authorized Client IDs list (so it accepts the native token's `aud`).

import type { SupabaseClient } from "@supabase/supabase-js";

// The iOS bundle id — this is the audience (`aud`) of the native identity token,
// and the client id the Apple sheet authorizes against.
const APPLE_CLIENT_ID = "com.ACGC.crave";

export interface AppleSignInResult {
  ok: boolean;
  /** Empty string means "user cancelled" — nothing to surface. */
  error?: string;
  /** True when we fell back to the browser OAuth redirect (web only). */
  usedWebFallback?: boolean;
}

async function getCapacitor() {
  try {
    const mod = await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ "@capacitor/core"
    );
    return mod.Capacitor;
  } catch {
    return null;
  }
}

/** SHA-256 hex of the raw nonce. Apple receives the hashed nonce; Supabase
 *  receives the raw nonce and re-hashes it to verify the token. */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomNonce(length = 32): string {
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join("");
}

/**
 * Sign in with Apple. Native sheet on device; browser OAuth redirect on web.
 * Returns { ok } — on success the Supabase session is set.
 */
export async function signInWithApple(
  supabase: SupabaseClient
): Promise<AppleSignInResult> {
  const Capacitor = await getCapacitor();
  const native = !!Capacitor?.isNativePlatform?.();

  // ── Web: keep the redirect flow (works fine in a real browser) ───────────
  if (!native) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { ok: !error, error: error?.message, usedWebFallback: true };
  }

  // ── Native: Apple sheet → identity token → Supabase ──────────────────────
  try {
    const { SocialLogin } = await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ "@capgo/capacitor-social-login"
    );

    // redirectUrl "" tells the plugin to use the native flow (no web redirect).
    await SocialLogin.initialize({ apple: { clientId: APPLE_CLIENT_ID, redirectUrl: "" } });

    const rawNonce = randomNonce();
    const hashedNonce = await sha256Hex(rawNonce);

    const { result } = await SocialLogin.login({
      provider: "apple",
      options: { scopes: ["email", "name"], nonce: hashedNonce },
    });

    const idToken = (result as { idToken?: string | null })?.idToken;
    if (!idToken) return { ok: false, error: "Apple didn't return an identity token." };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
      nonce: rawNonce,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string };
    const msg = err?.message || "";
    // User dismissed the native sheet — treat as a silent no-op.
    if (/cancel/i.test(msg) || err?.code === "CANCELED" || err?.code === "1001") {
      return { ok: false, error: "" };
    }
    return { ok: false, error: msg || "Apple sign-in failed." };
  }
}
