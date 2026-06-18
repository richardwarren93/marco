"use client";

// Screen 4 — the paywall. Annual ($49.99/yr, 3-day trial) is the pre-selected
// default; monthly ($7.99, no trial) is the decoy hidden behind "View more
// options". The native-style trial-reminder toggle is ON by default, and the
// soft "Maybe later" is the skip path (this is a skippable paywall).

import { useState } from "react";
import PaywallShell, { PlusPrimaryButton } from "./PaywallShell";
import { PLUS_PRICING, PLUS_TESTIMONIALS, PLUS_SOCIAL_PROOF } from "./plus-config";

const INK = "#1C1A17";
const TOMATO = "#E5462E";

// Compact value reinforcement shown right above the price. The cash-back line
// carries the green savings figure (the ROI hook).
const RECAP: { text: string; savings?: string }[] = [
  { text: "Unlimited recipes, meal plans & Sous Chef" },
  { text: "Auto-built grocery lists" },
  { text: "Grocery cash-back —", savings: `~${PLUS_PRICING.estimatedAnnualSavings}/yr` },
];

type Plan = "annual" | "monthly";

interface Props {
  /** Fires when the user starts the trial; carries the chosen plan + whether
   *  they kept the trial-end reminder on (Phase 2 wires this to RevenueCat). */
  onStartTrial: (plan: Plan, remind: boolean) => void;
  /** Soft skip — continue to the app on the free tier. */
  onSkip: () => void;
  onBack?: () => void;
}

export default function PlusPaywallScreen({ onStartTrial, onSkip, onBack }: Props) {
  const [plan, setPlan] = useState<Plan>("annual");
  const [showMore, setShowMore] = useState(false);
  const [remind, setRemind] = useState(true);

  const t = PLUS_TESTIMONIALS[0];
  const [before, after] = t.quote.split(t.emphasis);

  return (
    <PaywallShell
      eyebrow="Marco Plus"
      onClose={onSkip}
      footer={
        <div className="space-y-2">
          {/* Trial reminder toggle */}
          <div
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
            style={{ background: "rgba(255,253,247,0.7)", border: "1px solid rgba(28,26,23,0.12)" }}
          >
            <span
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontSize: "13.5px",
                color: INK,
              }}
            >
              Remind me before my trial ends
            </span>
            <button
              onClick={() => setRemind((r) => !r)}
              aria-label="Toggle trial reminder"
              className="relative rounded-full transition-colors flex-shrink-0"
              style={{ width: 46, height: 27, background: remind ? TOMATO : "rgba(28,26,23,0.22)" }}
            >
              <span
                className="absolute top-0.5 rounded-full bg-white transition-all"
                style={{ width: 23, height: 23, left: remind ? 21 : 2, boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
              />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 py-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill={INK}>
              <path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.47 7.83 1.3 10.39.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.15-2.54.99-1.46 1.4-2.87 1.42-2.94-.03-.01-2.73-1.05-2.76-4.16z" />
              <path d="M14.53 4.42c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.58 3.03-1.45z" />
            </svg>
            <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "13px", color: INK }}>
              No payment now{" "}
              <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span>
            </span>
          </div>

          <PlusPrimaryButton onClick={() => onStartTrial(plan, remind)}>Start for $0.00</PlusPrimaryButton>

          <button
            onClick={() => (showMore ? setShowMore(false) : setShowMore(true))}
            className="w-full text-center py-1.5"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontVariationSettings: '"opsz" 14, "wght" 500',
              fontSize: "13.5px",
              color: "rgba(28,26,23,0.6)",
              textDecoration: "underline",
            }}
          >
            {showMore ? "Hide options" : "View more options"}
          </button>

          <button
            onClick={onSkip}
            className="w-full text-center py-1"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontSize: "13px",
              color: "rgba(28,26,23,0.4)",
            }}
          >
            Maybe later
          </button>
        </div>
      }
    >
      {/* min-h-full + justify-center balances the whitespace on tall screens
          but lets content flow from the top (scroll) on short ones. */}
      <div className="min-h-full flex flex-col justify-center py-1">
        <div className="text-center">
          <h1
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontVariationSettings: '"opsz" 144, "wght" 700',
              fontSize: "30px",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: INK,
            }}
          >
            Upgrade your kitchen{" "}
            <em style={{ color: TOMATO, fontStyle: "italic" }}>free</em>
          </h1>

          {/* Social proof */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span style={{ color: "#E8A33D", fontSize: 15, letterSpacing: "1px" }}>★★★★★</span>
            <span
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(28,26,23,0.6)",
              }}
            >
              {PLUS_SOCIAL_PROOF}
            </span>
          </div>

          {/* Testimonial */}
          <p
            className="mt-3 px-2"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontSize: "15px",
              lineHeight: 1.4,
              color: "rgba(28,26,23,0.75)",
            }}
          >
            &ldquo;{before}
            <span style={{ color: TOMATO, fontStyle: "normal", fontWeight: 600 }}>{t.emphasis}</span>
            {after}&rdquo;
          </p>
        </div>

        {/* Value recap — reinforces what Plus unlocks at the decision point and
            balances the vertical rhythm above the price. */}
        <div
          className="mt-5 rounded-2xl px-4 py-3.5"
          style={{ background: "rgba(255,253,247,0.6)", border: "1px solid rgba(28,26,23,0.12)" }}
        >
          {RECAP.map((line, i) => (
            <div
              key={line.text}
              className="flex items-center gap-2.5"
              style={{ marginTop: i === 0 ? 0 : 10 }}
            >
              <span
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 19, height: 19, background: line.savings ? "#16a34a" : TOMATO, color: "white" }}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontSize: "13.5px",
                  color: INK,
                }}
              >
                {line.text}
                {line.savings && (
                  <span style={{ color: "#16a34a", fontWeight: 700 }}> {line.savings}</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Plan cards */}
        <div className="mt-5 space-y-2.5">
          <PlanCard
            selected={plan === "annual"}
            onSelect={() => setPlan("annual")}
            badge="Best value"
            title="12 months"
            price={`${PLUS_PRICING.annual.priceLabel}/yr`}
            sub={`${PLUS_PRICING.annual.trialDays}-day free trial · ${PLUS_PRICING.annual.monthlyEquivalent}/mo`}
          />

          {showMore && (
            <PlanCard
              selected={plan === "monthly"}
              onSelect={() => setPlan("monthly")}
              title="Monthly"
              price={`${PLUS_PRICING.monthly.priceLabel}/mo`}
              sub="No free trial"
              muted
            />
          )}
        </div>
      </div>
    </PaywallShell>
  );
}

function PlanCard({
  selected,
  onSelect,
  badge,
  title,
  price,
  sub,
  muted,
}: {
  selected: boolean;
  onSelect: () => void;
  badge?: string;
  title: string;
  price: string;
  sub: string;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className="relative w-full flex items-center justify-between px-4 py-3.5 text-left transition-all active:scale-[0.99]"
      style={{
        borderRadius: 14,
        background: selected ? "rgba(229,70,46,0.07)" : "rgba(255,253,247,0.5)",
        border: selected ? `1.5px solid ${TOMATO}` : "1px solid rgba(28,26,23,0.14)",
      }}
    >
      {badge && (
        <span
          className="absolute -top-2 left-4 rounded-full px-2 py-0.5"
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: "8px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "white",
            background: TOMATO,
          }}
        >
          {badge}
        </span>
      )}
      <div>
        <p
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontVariationSettings: '"opsz" 14, "wght" 600',
            fontSize: "16px",
            color: muted ? "rgba(28,26,23,0.7)" : INK,
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontStyle: "italic",
            fontSize: "12.5px",
            color: "rgba(28,26,23,0.55)",
          }}
        >
          {sub}
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <span
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontVariationSettings: '"opsz" 14, "wght" 700',
            fontSize: "16px",
            color: muted ? "rgba(28,26,23,0.7)" : INK,
          }}
        >
          {price}
        </span>
        <span
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 22,
            height: 22,
            border: selected ? `6px solid ${TOMATO}` : "2px solid rgba(28,26,23,0.25)",
            background: "white",
          }}
        />
      </div>
    </button>
  );
}
