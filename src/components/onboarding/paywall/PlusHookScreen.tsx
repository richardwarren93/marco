"use client";

// Screen 1 of the Plus upsell — the hook. Lands right after the Taste DNA
// reveal, so it explicitly continues that moment ("your profile is just the
// start") and leads with the ROI hook (saves ~$210 vs costs $49.99). CTA is the
// soft "Start for $0.00", never the price.

import PaywallShell, { PlusPrimaryButton } from "./PaywallShell";
import { PLUS_PRICING } from "./plus-config";
import { HandUnderline } from "../cookbook/CookbookOrnaments";

interface Props {
  onContinue: () => void;
  onClose?: () => void;
}

export default function PlusHookScreen({ onContinue, onClose }: Props) {
  const { annual, estimatedAnnualSavings } = PLUS_PRICING;

  return (
    <PaywallShell
      eyebrow="Marco Plus"
      eyebrowAside="The whole kitchen"
      onClose={onClose}
      footer={
        <div className="space-y-2.5">
          <PlusPrimaryButton onClick={onContinue}>Start for $0.00</PlusPrimaryButton>
          <p
            className="text-center"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontSize: "12.5px",
              color: "rgba(28, 26, 23, 0.55)",
            }}
          >
            {annual.trialDays} days free, then {annual.perLabel} · Cancel anytime
          </p>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center pt-1">
        <p
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontStyle: "italic",
            fontSize: "15px",
            color: "rgba(28, 26, 23, 0.65)",
          }}
        >
          Your Taste DNA is just the start.
        </p>

        <h1
          className="mt-2"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontVariationSettings: '"opsz" 144, "wght" 700',
            fontSize: "34px",
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            color: "#1C1A17",
          }}
        >
          Unlock your{" "}
          <em style={{ color: "#E5462E", fontStyle: "italic" }}>whole kitchen</em>
        </h1>

        <div className="mt-3 mb-1">
          <HandUnderline width={90} />
        </div>

        {/* ROI hero — the savings math does the selling */}
        <div
          className="mt-5 w-full rounded-2xl px-5 py-5"
          style={{
            background: "rgba(255, 253, 247, 0.7)",
            border: "1px solid rgba(28, 26, 23, 0.14)",
            boxShadow: "0 4px 16px rgba(74, 50, 20, 0.10)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(28, 26, 23, 0.5)",
            }}
          >
            With grocery cash-back
          </p>
          <p
            className="mt-2"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontVariationSettings: '"opsz" 144, "wght" 700',
              fontSize: "46px",
              lineHeight: 1,
              color: "#16a34a",
            }}
          >
            {estimatedAnnualSavings}
            <span style={{ fontSize: "16px", fontWeight: 600, color: "#22c55e" }}>/year</span>
          </p>
          <p
            className="mt-2"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontSize: "14px",
              color: "rgba(28, 26, 23, 0.7)",
            }}
          >
            Estimated savings — more than Plus costs.
          </p>
        </div>

        {/* Quick value bullets */}
        <div className="mt-4 w-full space-y-2.5 text-left">
          {[
            "Every recipe you'll ever love, unlimited",
            "Auto-built grocery lists with cash-back",
            "Cook hands-free with Sous Chef, anytime",
          ].map((line, i) => (
            <div
              key={line}
              className="flex items-center gap-3"
              style={{ animation: `cookbook-ink-fade-in 0.5s ease-out ${0.3 + i * 0.1}s both` }}
            >
              <span
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 22, height: 22, background: "#E5462E", color: "white" }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontSize: "14.5px",
                  color: "#1C1A17",
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PaywallShell>
  );
}
