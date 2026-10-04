import { Capacitor } from "@capacitor/core";

// Request notification permission. Native → Capacitor push (and register for a
// token); web → the Notifications API. Best-effort: returns whether granted,
// never throws, so onboarding can advance regardless.
export async function requestNotifications(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive === "granted") { await PushNotifications.register(); return true; }
      return false;
    }
    if (typeof Notification !== "undefined") {
      const res = await Notification.requestPermission();
      return res === "granted";
    }
    return false;
  } catch {
    return false;
  }
}
