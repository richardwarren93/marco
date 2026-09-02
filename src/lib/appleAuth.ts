"use client";

// Native "Sign in with Apple" for the Capacitor iOS shell, web-OAuth fallback
// for the browser.
//
// IMPORTANT — why this uses `window.Capacitor` and NOT `import("@capacitor/...")`:
// the app loads a REMOTE url in the WebView, so bare-specifier dynamic imports
// (`import("@capacitor/core")`) don't resolve at runtime — they throw, which
// made native detection silently fail and fall back to the broken web-OAuth
// redirect (the "black screen → Supabase" experience). The native shell injects
// `window.Capacitor` globally (and `window.Capacitor.Plugins.<Name>` for every
// synced native plugin), so we use that directly. @capgo registers as
// `SocialLogin` (see registerPlugin('SocialLogin', ...)).
//
// Native setup this depends on:
//   - "Sign In with Apple" capability on App ID com.ACGC.crave + the
//     com.apple.developer.applesignin entitlement (in the iOS build)
//   - Supabase → Auth → Apple provider enabled, with com.ACGC.crave listed in
//     the Authorized Client IDs (so it accepts the native token's `aud`).

import type { SupabaseClient } from "@supabase/supabase-js";

// iOS bundle id — the `aud` of the native identity token and the Apple client id.
const APPLE_CLIENT_ID = "com.ACGC.crave";

/* eslint-disable @typescript-eslint/no-explicit-any */
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, any>;
};

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

export interface AppleSignInResult {
  ok: boolean;
  /** Empty string means "user cancelled" — nothing to surface. */
  error?: string;
  /** True when we fell back to the browser OAuth redirect (web only). */
  usedWebFallback?: boolean;
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
 * On success the Supabase session is set.
 */
export async function signInWithApple(
  supabase: SupabaseClient
): Promise<AppleSignInResult> {
  const cap = getCapacitor();
  const native = !!cap?.isNativePlatform?.();

  // ── Web: keep the redirect flow (works fine in a real browser) ───────────
  if (!native) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { ok: !error, error: error?.message, usedWebFallback: true };
  }

  // ── Native: use the Capacitor-injected SocialLogin plugin ────────────────
  const SocialLogin = cap?.Plugins?.SocialLogin;
  if (!SocialLogin) {
    return { ok: false, error: "Apple sign-in isn't available on this build." };
  }

  try {
    // redirectUrl "" tells the plugin to use the native flow (no web redirect).
    await SocialLogin.initialize({ apple: { clientId: APPLE_CLIENT_ID, redirectUrl: "" } });

    const rawNonce = randomNonce();
    const hashedNonce = await sha256Hex(rawNonce);

    const res: any = await SocialLogin.login({
      provider: "apple",
      options: { scopes: ["email", "name"], nonce: hashedNonce },
    });

    const idToken: string | undefined = res?.result?.idToken ?? res?.idToken;
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
    // User dismissed the native sheet — silent no-op.
    if (/cancel/i.test(msg) || err?.code === "CANCELED" || err?.code === "1001") {
      return { ok: false, error: "" };
    }
    return { ok: false, error: msg || "Apple sign-in failed." };
  }
}
