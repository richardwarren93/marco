"use client";

import GuidedShell from "./GuidedShell";

/* Guided flow — grocery feature showcase, right after meal planning. A phone
   mockup of the auto-built, aisle-sorted grocery list, shown the same way as
   the meal-plan showcase. */

interface GItem {
  name: string;
  qty: string;
  done?: boolean;
}
const SECTIONS: { label: string; emoji: string; items: GItem[] }[] = [
  {
    label: "Produce",
    emoji: "🥬",
    items: [
      { name: "Shallots", qty: "2", done: true },
      { name: "Garlic", qty: "1 head" },
      { name: "Fresh basil", qty: "1 bunch" },
    ],
  },
  {
    label: "Meat & fish",
    emoji: "🥩",
    items: [
      { name: "Pork shoulder", qty: "1 kg", done: true },
      { name: "Shrimp", qty: "300 g" },
    ],
  },
  {
    label: "Dairy",
    emoji: "🧀",
    items: [{ name: "Cream cheese", qty: "1 tub" }],
  },
];

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue: () => void;
}

export default function GroceryFeatureStep({ step, totalSteps, onBack, onContinue }: Props) {
  let rowIdx = 0;
  return (
    <GuidedShell
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <button
          onClick={onContinue}
          className="w-full py-4 px-4 text-white rounded-2xl font-semibold text-base shadow-sm transition-colors"
          style={{ background: "var(--tomato, #E5462E)" }}
          onMouseDown={(e) => (e.currentTarget.style.background = "var(--tomato-dark, #B8331E)")}
          onMouseUp={(e) => (e.currentTarget.style.background = "var(--tomato, #E5462E)")}
        >
          Continue
        </button>
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
          Shop in <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>one trip</em>
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
          Every recipe you plan rolls up into one tidy, aisle-sorted list.
        </p>
      </div>

      {/* Phone mockup with the grocery list */}
      <div className="flex justify-center my-8 animate-stagger-in" style={{ animationDelay: "0.18s" }}>
        <div
          className="overflow-hidden"
          style={{
            width: "212px",
            borderRadius: "30px",
            background: "#1C1A17",
            padding: "7px",
            boxShadow: "0 20px 46px -14px rgba(28,26,23,0.45)",
          }}
        >
          <div className="overflow-hidden" style={{ borderRadius: "24px", background: "#F5EEE2" }}>
            {/* App bar */}
            <div className="flex items-center justify-between px-3.5 pt-3.5 pb-1.5">
              <span className="marco-signature" style={{ fontSize: "0.95rem" }}>
                Marco
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "7.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-soft, #4A4742)",
                }}
              >
                Groceries
              </span>
            </div>

            {/* Auto-added badge */}
            <div className="px-3.5 pb-2">
              <span
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "7px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--tomato, #E5462E)",
                  background: "rgba(229,70,46,0.1)",
                  padding: "3px 7px",
                  borderRadius: "6px",
                }}
              >
                Auto-added from 3 recipes
              </span>
            </div>

            {/* Sections */}
            <div className="px-3 pb-3.5 flex flex-col gap-2.5">
              {SECTIONS.map((sec) => (
                <div key={sec.label}>
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span style={{ fontSize: "11px" }}>{sec.emoji}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "7.5px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--ink-soft, #4A4742)",
                      }}
                    >
                      {sec.label}
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(28,26,23,0.07)",
                      borderRadius: "10px",
                      overflow: "hidden",
                    }}
                  >
                    {sec.items.map((it, j) => {
                      rowIdx += 1;
                      return (
                        <div
                          key={it.name}
                          className="flex items-center gap-2 px-2.5 animate-stagger-in"
                          style={{
                            paddingTop: "6px",
                            paddingBottom: "6px",
                            borderTop: j === 0 ? "none" : "1px solid rgba(28,26,23,0.05)",
                            animationDelay: `${0.3 + rowIdx * 0.06}s`,
                          }}
                        >
                          {/* checkbox */}
                          <span
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                              width: "13px",
                              height: "13px",
                              borderRadius: "4px",
                              background: it.done ? "var(--tomato, #E5462E)" : "transparent",
                              border: it.done ? "none" : "1.5px solid rgba(28,26,23,0.25)",
                            }}
                          >
                            {it.done && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span
                            className="flex-1 truncate"
                            style={{
                              fontFamily: "var(--font-display, Georgia, serif)",
                              fontVariationSettings: '"opsz" 14, "wght" 450',
                              fontSize: "10.5px",
                              color: it.done ? "var(--ink-soft, #4A4742)" : "var(--ink, #1C1A17)",
                              textDecoration: it.done ? "line-through" : "none",
                            }}
                          >
                            {it.name}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono, monospace)",
                              fontSize: "8px",
                              color: "var(--ink-soft, #4A4742)",
                            }}
                          >
                            {it.qty}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GuidedShell>
  );
}
