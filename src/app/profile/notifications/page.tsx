"use client";

import { useEffect, useState } from "react";
import SubPageHeader from "@/components/layout/SubPageHeader";

/* Notifications — permission status + enable. Mirrors the onboarding
   NotificationsStep request logic: Capacitor push on native, the Notification
   API on web. Once denied, the OS owns the setting — we say so honestly. */

type Perm = "granted" | "denied" | "prompt" | "unsupported";

async function checkPermission(): Promise<Perm> {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const { PushNotifications } = await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ "@capacitor/push-notifications"
      );
      const perm = await PushNotifications.checkPermissions();
      if (perm.receive === "granted") return "granted";
      if (perm.receive === "denied") return "denied";
      return "prompt";
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") return "granted";
      if (Notification.permission === "denied") return "denied";
      return "prompt";
    }
  } catch { /* fall through */ }
  return "unsupported";
}

async function requestPermission(): Promise<void> {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const { PushNotifications } = await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ "@capacitor/push-notifications"
      );
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive === "granted") await PushNotifications.register();
      return;
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      await Notification.requestPermission();
    }
  } catch { /* never block on a permission hiccup */ }
}

const COPY: Record<Perm, { icon: string; title: string; body: string }> = {
  granted: { icon: "🔔", title: "Notifications are on", body: "We'll nudge you before dinner so your streak — and your tomato — stay alive." },
  prompt: { icon: "🍅", title: "Keep your streak alive", body: "A nudge at dinnertime keeps your tomato happy and the right recipe in front of you." },
  denied: { icon: "🔕", title: "Notifications are off", body: "They're disabled at the system level — enable them for Marco in your device settings and we'll take it from there." },
  unsupported: { icon: "📱", title: "Not available here", body: "This browser doesn't support notifications — they work great in the Marco app." },
};

export default function NotificationsPage() {
  const [perm, setPerm] = useState<Perm | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => { checkPermission().then(setPerm); }, []);

  async function handleEnable() {
    if (requesting) return;
    setRequesting(true);
    await requestPermission();
    setPerm(await checkPermission());
    setRequesting(false);
  }

  const c = perm ? COPY[perm] : null;

  return (
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <SubPageHeader title="Notifications" />
      <div className="max-w-lg mx-auto px-4 pt-1" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        {c && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)", boxShadow: "0 2px 12px rgba(28,26,23,0.05)" }}
          >
            <span className="text-4xl block mb-3">{c.icon}</span>
            <p className="font-semibold text-[15.5px]" style={{ color: "#1C1A17" }}>{c.title}</p>
            <p className="text-[13px] mt-1.5 leading-relaxed max-w-xs mx-auto" style={{ color: "#6B655C" }}>{c.body}</p>
            {perm === "prompt" && (
              <button
                onClick={handleEnable}
                disabled={requesting}
                className="mt-5 w-full py-3.5 rounded-2xl font-semibold text-[14.5px] text-white active:scale-[0.98] transition-transform disabled:opacity-60"
                style={{ background: "#E5462E" }}
              >
                {requesting ? "Asking…" : "Turn on notifications"}
              </button>
            )}
            {perm === "granted" && (
              <p className="mt-4 text-[11.5px]" style={{ color: "#9b938a" }}>Turn off anytime in your device settings.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
