"use client";

// Screen 2 of the Plus upsell — the Free vs Plus comparison. Anchors loss: the
// Plus column is a full stack of green checks/values while Free is visibly
// thinner. The cash-back row is highlighted as the ROI hook.

import PaywallShell, { PlusPrimaryButton } from "./PaywallShell";
import { PLUS_FEATURES, PLUS_PRICING, type PlusFeatureRow } from "./plus-config";

const TOMATO = "#E5462E";
const INK = "#1C1A17";

function Cell({ value, plus }: { value: string | boolean; plus?: boolean }) {
  if (value === true) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full"
        style={{ width: 20, height: 20, background: plus ? TOMATO : "rgba(28,26,23,0.18)", color: "white" }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </span>
    );
  }
  if (value === false) {
    return <span style={{ color: "rgba(28,26,23,0.28)", fontSize: 16 }}>—</span>;
  }
  return (
    <span
      style={{
        fontFamily: "var(--font-display, Georgia, serif)",
        fontVariationSettings: '"opsz" 14, "wght" 600',
        fontSize: "12.5px",
        color: plus ? TOMATO : "rgba(28,26,23,0.6)",
        textAlign: "center",
        lineHeight: 1.15,
      }}
    >
      {value}
    </span>
  );
}

export default function PlusCompareScreen({
  onContinue,
  onBack,
  onClose,
}: {
  onContinue: () => void;
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <PaywallShell
      eyebrow="Marco Plus"
      eyebrowAside="What you get"
      onClose={onClose}
      footer={<PlusPrimaryButton onClick={onContinue}>Start for $0.00</PlusPrimaryButton>}
    >
      <h1
        className="text-center"
        style={{
          fontFamily: "var(--font-display, Georgia, serif)",
          fontVariationSettings: '"opsz" 144, "wght" 700',
          fontSize: "28px",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: INK,
        }}
      >
        Free vs <em style={{ color: TOMATO, fontStyle: "italic" }}>Plus</em>
      </h1>

      <div
        className="mt-4 rounded-2xl overflow-hidden"
        style={{ background: "rgba(255, 253, 247, 0.6)", border: "1px solid rgba(28, 26, 23, 0.14)" }}
      >
        {/* Column headers */}
        <div
          className="grid items-center px-3.5 py-2.5"
          style={{ gridTemplateColumns: "1fr 64px 64px", borderBottom: "1px solid rgba(28,26,23,0.10)" }}
        >
          <span />
          <span
            className="text-center"
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(28,26,23,0.5)",
            }}
          >
            Free
          </span>
          <span
            className="text-center rounded-lg py-0.5"
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "white",
              background: TOMATO,
            }}
          >
            Plus
          </span>
        </div>

        {/* Rows */}
        {PLUS_FEATURES.map((row: PlusFeatureRow, i) => (
          <div
            key={row.label}
            className="grid items-center px-3.5 py-3"
            style={{
              gridTemplateColumns: "1fr 64px 64px",
              borderBottom: i < PLUS_FEATURES.length - 1 ? "1px solid rgba(28,26,23,0.06)" : "none",
              background: row.hero ? "rgba(22,163,74,0.06)" : "transparent",
              animation: `cookbook-ink-fade-in 0.45s ease-out ${0.15 + i * 0.06}s both`,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontSize: "13.5px",
                lineHeight: 1.2,
                color: INK,
                paddingRight: 8,
              }}
            >
              {row.label}
              {row.hero && (
                <span
                  className="ml-1.5 align-middle inline-block rounded px-1.5 py-0.5"
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: "8px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#16a34a",
                    background: "rgba(22,163,74,0.12)",
                  }}
                >
                  Pays for itself
                </span>
              )}
            </span>
            <span className="flex items-center justify-center">
              <Cell value={row.free} />
            </span>
            <span className="flex items-center justify-center">
              <Cell value={row.plus} plus />
            </span>
          </div>
        ))}
      </div>

      <p
        className="text-center mt-3"
        style={{
          fontFamily: "var(--font-display, Georgia, serif)",
          fontStyle: "italic",
          fontSize: "12.5px",
          color: "rgba(28, 26, 23, 0.55)",
        }}
      >
        {PLUS_PRICING.annual.trialDays} days free, then {PLUS_PRICING.annual.perLabel}.
      </p>

      {onBack && (
        <button
          onClick={onBack}
          className="w-full text-center mt-1.5 py-1"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "13px",
            color: "rgba(28,26,23,0.4)",
          }}
        >
          Back
        </button>
      )}
    </PaywallShell>
  );
}
