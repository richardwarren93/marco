"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Wires the @capacitor/push-notifications plugin to Supabase.
//
// On native iOS/Android: requests permission, registers with APNs/FCM,
// listens for the device token, and POSTs it to /api/push-tokens so the
// server can target this device later.
//
// On web: no-op. We dynamic-import the Capacitor modules so the plugin's
// native bindings don't even attempt to load in browser bundles.
//
// Re-runs on every SIGNED_IN auth event (not just initial mount). The
// previous version only fired once on mount — so a user who opened the
// app signed out and then signed in never saw the iOS permission prompt
// until they force-quit and relaunched. Listening to onAuthStateChange
// closes that gap. Guarded by a ref so we don't double-register or
// re-prompt within a single session.
//
// Apple guideline 4.2 expectations: reviewers want to see the iOS
// permission prompt actually fire. We deliberately do NOT pre-show a
// soft "would you like notifications?" prompt — Capacitor's behavior
// is already to call iOS's native dialog, and a double prompt feels
// worse than a single direct one.
export default function PushNotificationManager() {
  // True once we've successfully registered with APNs/FCM in this
  // session. Reset on sign-out so a different user signing in on the
  // same device re-registers and gets their own token row.
  const registered = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const pluginCleanup: Array<() => void> = [];

    async function tryRegister() {
      if (registered.current || cancelled) return;

      const { Capacitor } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { PushNotifications } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "@capacitor/push-notifications");

      // Permission. On iOS this triggers the system dialog if it
      // hasn't been answered yet. If the user has already denied, we
      // bail silently — they have to flip the toggle in iOS Settings.
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted" || cancelled) return;

      // Register listeners BEFORE calling register() so the 'registration'
      // event isn't lost on a fast device.
      const regListener = await PushNotifications.addListener(
        "registration",
        async (data) => {
          await fetch("/api/push-tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: data.value,
              platform: Capacitor.getPlatform(), // 'ios' or 'android'
            }),
          });
        }
      );

      const errListener = await PushNotifications.addListener(
        "registrationError",
        (err) => {
          // Failed APNs registration is almost always an
          // entitlement/profile issue the user can't fix in-app, so we
          // just log instead of surfacing.
          // eslint-disable-next-line no-console
          console.warn("[push] registrationError", err);
        }
      );
      pluginCleanup.push(() => regListener.remove());
      pluginCleanup.push(() => errListener.remove());

      await PushNotifications.register();
      registered.current = true;
    }

    // 1) Initial attempt on mount (covers users already signed in at launch).
    tryRegister();

    // 2) Re-attempt on sign-in (covers the open-app-signed-out-then-sign-in flow).
    //    Reset the guard on sign-out so a different user on the same device
    //    can register their own token next time they sign in.
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (event === "SIGNED_IN") {
          tryRegister();
        } else if (event === "SIGNED_OUT") {
          registered.current = false;
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      pluginCleanup.forEach((fn) => fn());
    };
  }, []);

  return null;
}
