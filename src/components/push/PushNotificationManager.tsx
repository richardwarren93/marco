"use client";

import { useEffect } from "react";
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
// Apple guideline 4.2 expectations: reviewers want to see the iOS
// permission prompt actually fire. We trigger it once per authenticated
// session on first mount. We deliberately do NOT pre-show a soft prompt
// asking "would you like notifications?" — Capacitor's behavior is
// already to call iOS's native dialog, and a double prompt feels worse
// than a single direct one. If we later want a softer pre-prompt, gate
// this effect behind a state flag set by an in-app explainer screen.
export default function PushNotificationManager() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      // Skip if not signed in — we have nowhere to attach the token.
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      // 1. Permission. On iOS this triggers the system dialog if it
      //    hasn't been answered yet. If the user has already denied, we
      //    bail silently (settings change required).
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted" || cancelled) return;

      // 2. Register listeners BEFORE calling register() so the
      //    'registration' event isn't lost on a fast device.
      const registrationListener = await PushNotifications.addListener(
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

      const errorListener = await PushNotifications.addListener(
        "registrationError",
        (err) => {
          // We log instead of surfacing because failed APNs registration
          // is almost always an entitlement/profile issue the user can't
          // fix in-app — it's a dev/build-time concern.
          // eslint-disable-next-line no-console
          console.warn("[push] registrationError", err);
        }
      );

      // 3. Kick off registration with APNs / FCM.
      await PushNotifications.register();

      return () => {
        registrationListener.remove();
        errorListener.remove();
      };
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
