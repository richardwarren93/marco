"use client";

// RevenueCat wrapper for Marco Plus. RevenueCat bridges to native StoreKit, so
// these calls only do real work inside the Capacitor native shell — in a plain
// web browser every function is a safe no-op (returns "not available"), letting
// the paywall UI run in the web preview without purchasing. Mirrors the guarded
// dynamic-import pattern used by PushNotificationManager.
//
// Setup that must exist for this to function on device (see PHASE2-SETUP.md):
//   - NEXT_PUBLIC_REVENUECAT_IOS_KEY env var (RevenueCat public SDK key)
//   - RevenueCat "offering" with packages whose product ids match
//     PLUS_PRICING.{annual,monthly}.productId in plus-config.ts
//   - An entitlement named PLUS_ENTITLEMENT_ID in the RevenueCat dashboard

import { PLUS_PRICING } from "@/components/onboarding/paywall/plus-config";

// The entitlement identifier configured in the RevenueCat dashboard. A customer
// who owns it is "Plus".
export const PLUS_ENTITLEMENT_ID = "plus";

export type PlanKey = "annual" | "monthly";

export interface PurchaseResult {
  /** true if the user now holds the Plus entitlement. */
  active: boolean;
  /** true when running somewhere purchases can't happen (web preview). */
  unavailable?: boolean;
  /** true if the native flow was cancelled by the user. */
  cancelled?: boolean;
  error?: string;
}

// Lazily resolve the native plugin; returns null on web so callers no-op.
//
// Uses the injected `window.Capacitor` global — NOT `import(...)`. The app loads
// a REMOTE url in the WebView, where bare-specifier dynamic imports
// (`import("@capacitor/core")` / `import("@revenuecat/purchases-capacitor")`)
// don't resolve at runtime — they threw, so getPlugin always returned null and
// every purchase/configure call silently no-op'd on device (no StoreKit sheet,
// nothing in RevenueCat). The native plugin is registered as
// `window.Capacitor.Plugins.Purchases`, and RevenueCat's exported `Purchases` is
// just a Proxy over it that only transforms `trackCustomPaywallImpression` — so
// every method we use (configure/logIn/getOfferings/purchasePackage/…) passes
// straight through. LOG_LEVEL is a JS enum in the wrapper; the native side only
// needs its string values, so we supply them.
/* eslint-disable @typescript-eslint/no-explicit-any */
async function getPlugin(): Promise<{ Purchases: any; LOG_LEVEL: Record<string, string> } | null> {
  try {
    if (typeof window === "undefined") return null;
    const cap = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, any> };
    }).Capacitor;
    if (!cap?.isNativePlatform?.()) return null;
    const Purchases = cap.Plugins?.Purchases;
    if (!Purchases) return null;
    const LOG_LEVEL = { VERBOSE: "VERBOSE", DEBUG: "DEBUG", INFO: "INFO", WARN: "WARN", ERROR: "ERROR" };
    return { Purchases, LOG_LEVEL };
  } catch {
    return null;
  }
}

let configured = false;

/** Configure RevenueCat and bind the customer to our Supabase user id so the
 *  webhook can map store events back to the right account. Safe to call on
 *  every sign-in; re-binds via logIn if already configured. */
export async function configurePurchases(supabaseUserId: string): Promise<boolean> {
  const mod = await getPlugin();
  if (!mod) return false;
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;
  if (!apiKey) return false;
  const { Purchases, LOG_LEVEL } = mod;
  try {
    if (!configured) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      await Purchases.configure({ apiKey, appUserID: supabaseUserId });
      configured = true;
    } else {
      await Purchases.logIn({ appUserID: supabaseUserId });
    }
    return true;
  } catch {
    return false;
  }
}

function entitlementActive(customerInfo: unknown): boolean {
  try {
    const active = (customerInfo as { entitlements?: { active?: Record<string, unknown> } })?.entitlements?.active ?? {};
    return Object.prototype.hasOwnProperty.call(active, PLUS_ENTITLEMENT_ID);
  } catch {
    return false;
  }
}

/** Whether the current customer already holds Plus (e.g. resubscribe / restore
 *  on a fresh install). No-op false on web. */
export async function isPlusActive(): Promise<boolean> {
  const mod = await getPlugin();
  if (!mod) return false;
  try {
    const { customerInfo } = await mod.Purchases.getCustomerInfo();
    return entitlementActive(customerInfo);
  } catch {
    return false;
  }
}

/** Kick off the native purchase for the chosen plan. Picks the matching package
 *  out of the current offering by store product id. */
export async function purchasePlus(plan: PlanKey): Promise<PurchaseResult> {
  const mod = await getPlugin();
  if (!mod) return { active: false, unavailable: true };
  const { Purchases } = mod;
  const wantedProductId =
    plan === "annual" ? PLUS_PRICING.annual.productId : PLUS_PRICING.monthly.productId;
  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    // RevenueCat's standard package-type string for the chosen plan, used as a
    // fallback when the store product id doesn't match directly.
    const wantedType = plan === "annual" ? "ANNUAL" : "MONTHLY";
    const pkg =
      packages.find((p: any) => p.product.identifier === wantedProductId) ??
      packages.find((p: any) => String(p.packageType) === wantedType);
    if (!pkg) return { active: false, error: "Plan not available" };

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return { active: entitlementActive(customerInfo) };
  } catch (e: unknown) {
    const err = e as { code?: string; userCancelled?: boolean; message?: string };
    if (err?.userCancelled || err?.code === "PURCHASE_CANCELLED") {
      return { active: false, cancelled: true };
    }
    return { active: false, error: err?.message || "Purchase failed" };
  }
}

/** Restore prior purchases (App Store requirement). No-op false on web. */
export async function restorePurchases(): Promise<PurchaseResult> {
  const mod = await getPlugin();
  if (!mod) return { active: false, unavailable: true };
  try {
    const { customerInfo } = await mod.Purchases.restorePurchases();
    return { active: entitlementActive(customerInfo) };
  } catch (e: unknown) {
    return { active: false, error: (e as { message?: string })?.message || "Restore failed" };
  }
}
