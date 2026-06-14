# Marco Plus — Phase 2 (RevenueCat) setup

All the **code** for in-app purchases is written and wired (guarded so it's inert
on web and behind the `PAYWALL_ENABLED` / `ENFORCE_ENTITLEMENTS` flags). What's
left is **external configuration** that can only be done in dashboards + a native
build, plus running the DB migration. StoreKit purchases only work in the native
iOS shell (sandbox/TestFlight) — never in the web dev server.

## 0. Run the DB migration
Apply `supabase/migration-subscription.sql` to Supabase. It adds the
`subscription_tier` / `plus_*` columns **and** a trigger that blocks clients from
writing them (only the service-role webhook can). Until this runs, the app still
works — entitlement reads fail-safe to `free`.

## 1. App Store Connect — create the products
Subscription group "Marco Plus", with two auto-renewable subscriptions whose
**Product IDs must match** `src/components/onboarding/paywall/plus-config.ts`:

| Plan | Product ID | Price | Intro offer |
|------|-----------|-------|-------------|
| Annual (hero) | `marco_plus_annual` | $49.99 / year | 3-day free trial |
| Monthly (decoy) | `marco_plus_monthly` | $7.99 / month | none |

(Bundle ID is `com.ACGC.crave`.) Fill in the localized display name, review
screenshot, and the "Subscription" tax category.

## 2. RevenueCat dashboard
1. Create a project; add an **App** for iOS with bundle `com.ACGC.crave` and your
   App Store Connect **In-App Purchase shared secret**.
2. **Import products** `marco_plus_annual` and `marco_plus_monthly`.
3. Create an **Entitlement** with identifier **`plus`** (must equal
   `PLUS_ENTITLEMENT_ID` in `src/lib/purchases.ts`) and attach both products.
4. Create an **Offering** (e.g. `default`) with two packages — Annual →
   `marco_plus_annual`, Monthly → `marco_plus_monthly`.
5. Copy the **public SDK key** for the Apple app (starts with `appl_`).

## 3. Environment variables
Add to Vercel (Production + Preview) and your local `.env.local`:

```
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxxxxxxxxxx   # RevenueCat public SDK key
REVENUECAT_WEBHOOK_SECRET=<a long random string you choose>
```

## 4. RevenueCat webhook
Dashboard → Integrations → Webhooks:
- **URL:** `https://marco-eta-lyart.vercel.app/api/webhooks/revenuecat`
- **Authorization header:** the exact value of `REVENUECAT_WEBHOOK_SECRET`.

The webhook ([route](src/app/api/webhooks/revenuecat/route.ts)) maps the
customer's `app_user_id` (which we set to the Supabase user id via
`Purchases.logIn`) to their profile and writes the entitlement columns.

## 5. Install the native plugin
```
npm install @revenuecat/purchases-capacitor   # verify the version supports Capacitor 8
npx cap sync ios
```
The dependency is already declared in `package.json` (`^11.0.0`) — **confirm that
version is compatible with Capacitor 8.3** and adjust if RevenueCat hasn't shipped
a Cap 8 build yet. (`@capacitor/core` etc. must also be `npm install`-ed; this
working copy doesn't have node_modules populated, which is why the build shows
"module not found" for Capacitor.)

## 6. Test in sandbox (before going live)
1. Native build to a device/simulator, signed into a **sandbox Apple ID**.
2. Run onboarding to the paywall, tap **Start for $0.00**, complete the sandbox
   purchase.
3. Confirm the webhook fired and `user_profiles.subscription_tier = 'plus'` for
   that user.
4. Confirm `GET /api/entitlement` returns `isPlus: true`.

## 7. Go live (flip the flags)
Only after sandbox works end-to-end:
- `PAYWALL_ENABLED = true` in `src/app/onboarding/page.tsx` (shows the paywall
  after Taste DNA).
- `ENFORCE_ENTITLEMENTS = true` in `src/lib/entitlements.ts` (activates the free
  caps + Plus unlocks).

Deploy the web app to Vercel, then rebuild/submit the iOS app. Keep both flags
`false` until the products are **Approved** in App Store Connect, or the paywall
will show with no purchasable product.

## What's wired in code (for reference)
- `src/lib/purchases.ts` — RevenueCat wrapper (configure/purchase/restore/isPlusActive), native-only, web no-op.
- `src/components/purchases/PurchasesManager.tsx` — configures + `logIn`s the user on sign-in (mounted in `Providers`).
- `src/app/onboarding/page.tsx` — paywall `Start for $0.00` → `purchasePlus(plan)`; web/unavailable falls through to the app, cancel keeps the paywall.
- `src/app/api/webhooks/revenuecat/route.ts` — entitlement sync (service-role write).
- Restore purchases: call `restorePurchases()` from `src/lib/purchases.ts` (wire a "Restore" button in Settings — App Store requires one somewhere).
