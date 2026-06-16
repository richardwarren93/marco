"use client";

// Screen 3 of the Plus upsell — the trial-reminder reassurance. Removing the
// "I'll forget to cancel and get charged" anxiety is the single biggest lever
// on trial-start rate, so we surface the real reminder date and the
// no-penalty promise before the actual paywall.

import { useMemo } from "react";
import PaywallShell, { PlusPrimaryButton } from "./PaywallShell";
import { PLUS_PRICING } from "./plus-config";

const INK = "#1C1A17";
const TOMATO = "#E5462E";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TrialReminderScreen({
  onContinue,
  onBack,
  onClose,
}: {
  onContinue: () => void;
  onBack?: () => void;
  onClose?: () => void;
}) {
  const { trialDays } = PLUS_PRICING.annual;

  // Reminder lands the day before the trial ends; trial ends after trialDays.
  const { reminderLabel, endLabel } = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + trialDays);
    const reminder = new Date(end);
    reminder.setDate(reminder.getDate() - 1);
    return { reminderLabel: formatDate(reminder), endLabel: formatDate(end) };
  }, [trialDays]);

  return (
    <PaywallShell
      eyebrow="salt & spoon Plus"
      eyebrowAside="No surprises"
      onClose={onClose}
      footer={
        <div className="space-y-2.5">
          <p
            className="text-center"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontSize: "13px",
              color: "rgba(28, 26, 23, 0.6)",
            }}
          >
            Easy to cancel — no penalties or fees.
          </p>
          <PlusPrimaryButton onClick={onContinue}>Continue</PlusPrimaryButton>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center h-full">
        <h1
          className="mt-1"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontVariationSettings: '"opsz" 144, "wght" 700',
            fontSize: "30px",
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
            color: INK,
          }}
        >
          We'll remind you{" "}
          <em style={{ color: TOMATO, fontStyle: "italic" }}>1 day before</em> your trial ends
        </h1>

        <p
          className="mt-3"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "14.5px",
            color: "rgba(28, 26, 23, 0.7)",
          }}
        >
          You'll get a reminder on{" "}
          <strong style={{ color: INK }}>{reminderLabel}</strong>.
        </p>

        {/* Bell illustration */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 120,
              height: 120,
              background: "rgba(229,70,46,0.08)",
              border: "1.5px solid rgba(229,70,46,0.25)",
            }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={TOMATO} strokeWidth={1.7}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          </div>
        </div>

        {/* Mini timeline */}
        <div className="w-full mb-1">
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <TimelineNode label="Today" sub="Full access" active />
            <div className="flex-1 h-px" style={{ background: "rgba(28,26,23,0.18)" }} />
            <TimelineNode label={reminderLabel} sub="Reminder" />
            <div className="flex-1 h-px" style={{ background: "rgba(28,26,23,0.18)" }} />
            <TimelineNode label={endLabel} sub="Trial ends" />
          </div>
        </div>
      </div>
    </PaywallShell>
  );
}

function TimelineNode({ label, sub, active }: { label: string; sub: string; active?: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
      <span
        className="rounded-full mb-1"
        style={{ width: 9, height: 9, background: active ? TOMATO : "rgba(28,26,23,0.3)" }}
      />
      <span
        style={{
          fontFamily: "var(--font-display, Georgia, serif)",
          fontVariationSettings: '"opsz" 14, "wght" 600',
          fontSize: "11.5px",
          color: INK,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: "8px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(28,26,23,0.45)",
        }}
      >
        {sub}
      </span>
    </div>
  );
}
