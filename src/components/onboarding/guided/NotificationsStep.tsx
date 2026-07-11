"use client";

import { useState } from "react";
import GuidedShell from "./GuidedShell";

/* Guided flow — notifications opt-in, shown right after the Taste DNA reveal
   (permission grants are highest right after a payoff moment). Framed around
   the streak/tomato loop: a mock of the iOS permission dialog as the hero,
   then a CTA that actually fires the permission request. Native uses the
   Capacitor push plugin (dynamic-imported, native-only); web falls back to
   the Notification API. Either way we never block onboarding. */

async function requestNotifications(): Promise<void> {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const { PushNotifications } = await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ "@capacitor/push-notifications"
      );
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive === "granted") {
        await PushNotifications.register();
      }
      return;
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      await Notification.requestPermission();
    }
  } catch {
    /* never block onboarding on a permission hiccup */
  }
}

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue: () => void;
}

export default function NotificationsStep({ step, totalSteps, onBack, onContinue }: Props) {
  const [requesting, setRequesting] = useState(false);

  const handle = async () => {
    if (requesting) return;
    setRequesting(true);
    await requestNotifications();
    onContinue();
  };

  return (
    <GuidedShell
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <>
          <p
            className="text-center pb-3"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontVariationSettings: '"opsz" 14, "wght" 400',
              fontSize: "13px",
              color: "var(--ink-soft, #4A4742)",
            }}
          >
            Turn off notifications anytime
          </p>
          <button
            onClick={handle}
            disabled={requesting}
            className="w-full py-4 px-4 text-white rounded-2xl font-semibold text-base shadow-sm transition-colors"
            style={{ background: "var(--tomato, #E5462E)", opacity: requesting ? 0.7 : 1 }}
            onMouseDown={(e) => (e.currentTarget.style.background = "var(--tomato-dark, #B8331E)")}
            onMouseUp={(e) => (e.currentTarget.style.background = "var(--tomato, #E5462E)")}
          >
            Help me stay on track
          </button>
        </>
      }
    >
      {/* Heading + copy */}
      <div className="text-center pt-7 animate-stagger-in" style={{ animationDelay: "0.03s" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
            fontSize: "28px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          Keep your <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>streak</em> alive
        </h1>
        <p
          className="mt-3 max-w-xs mx-auto"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "16px",
            lineHeight: 1.45,
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          A nudge before dinner keeps your tomato happy — and the right recipe in front of you at the right time.
        </p>
      </div>

      {/* iOS permission dialog mock */}
      <div className="flex justify-center my-9 animate-stagger-in" style={{ animationDelay: "0.18s" }}>
        <div
          style={{
            width: "270px",
            background: "rgba(247,244,238,0.92)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            boxShadow: "0 20px 48px -16px rgba(28,26,23,0.4)",
            border: "1px solid rgba(28,26,23,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Dialog body */}
          <div className="px-5 pt-5 pb-4 text-center">
            <p
              style={{
                fontFamily: "-apple-system, system-ui, sans-serif",
                fontSize: "15px",
                fontWeight: 600,
                color: "#1C1A17",
                lineHeight: 1.25,
                marginBottom: "6px",
              }}
            >
              &ldquo;Marco&rdquo; Would Like to Send You Notifications
            </p>
            <p
              style={{
                fontFamily: "-apple-system, system-ui, sans-serif",
                fontSize: "12px",
                color: "#4A4742",
                lineHeight: 1.35,
              }}
            >
              Notifications may include alerts, sounds and icon badges. These can be configured in Settings.
            </p>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2" style={{ borderTop: "0.5px solid rgba(28,26,23,0.15)" }}>
            <div
              className="py-2.5 text-center"
              style={{
                fontFamily: "-apple-system, system-ui, sans-serif",
                fontSize: "15px",
                color: "#8A8782",
                borderRight: "0.5px solid rgba(28,26,23,0.15)",
              }}
            >
              Don&apos;t Allow
            </div>
            <div
              className="py-2.5 text-center"
              style={{
                fontFamily: "-apple-system, system-ui, sans-serif",
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--tomato, #E5462E)",
              }}
            >
              Allow
            </div>
          </div>
        </div>
      </div>
    </GuidedShell>
  );
}
