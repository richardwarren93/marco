"use client";

import { useEffect, useState } from "react";
import type { Ingredient } from "@/types";

/**
 * Phase 1 — the one-time-swap flavour from the design spec. User taps an
 * ingredient on the recipe detail page; this sheet pops up from the bottom
 * with 2–3 LLM-ranked substitutes. Standing prefs (profile-level "always sub
 * X for Y") and dietary filters are explicitly Phase 2.
 */

interface SubstitutionOption {
  name: string;
  amount: string;
  unit: string;
  ratioNote?: string;
  reasoning: string;
  quality: "best" | "good" | "ok";
}

interface SubstitutionResult {
  role: string;
  options: SubstitutionOption[];
}

interface Props {
  recipeId: string;
  /** The ingredient the user tapped. Null when the sheet is closed. */
  target: Ingredient | null;
  onClose: () => void;
}

export default function SubstitutionSheet({ recipeId, target, onClose }: Props) {
  if (!target) return null;
  // Key the inner component on the target name so re-tapping a different
  // ingredient remounts cleanly — fresh fetch, fresh state, no in-effect
  // setState gymnastics.
  return (
    <SubstitutionSheetInner
      key={target.name}
      recipeId={recipeId}
      target={target}
      onClose={onClose}
    />
  );
}

function SubstitutionSheetInner({
  recipeId,
  target,
  onClose,
}: {
  recipeId: string;
  target: Ingredient;
  onClose: () => void;
}) {
  const [data, setData] = useState<SubstitutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/recipes/${recipeId}/substitute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: target.name,
        amount: target.amount ?? "",
        unit: target.unit ?? "",
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || "Could not load substitutes");
        }
        const json = (await res.json()) as SubstitutionResult;
        setData(json);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Something went wrong");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [recipeId, target]);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const targetLabel = [target.amount, target.unit, target.name].filter(Boolean).join(" ").trim();

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end"
      style={{ background: "rgba(28, 26, 23, 0.35)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Substitutes for ${targetLabel}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-t-2xl"
        style={{
          background: "var(--cream, #F5EEE2)",
          maxHeight: "82vh",
          paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
          animation: "subSheetIn 0.22s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span
            aria-hidden="true"
            className="block rounded-full"
            style={{ width: 36, height: 4, background: "var(--ink-soft, #4A4742)", opacity: 0.25 }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-1">
          <p className="marco-mono" style={{ color: "var(--tomato, #E5462E)" }}>
            Substitute for
          </p>
          <p
            className="mt-1.5"
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontStyle: "italic",
              fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 400',
              fontSize: "22px",
              color: "var(--ink, #1C1A17)",
              lineHeight: 1.2,
            }}
          >
            {targetLabel}
          </p>
          {data?.role && (
            <p
              className="mt-2 text-[12px]"
              style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.85 }}
            >
              Role in this recipe:{" "}
              <span style={{ fontWeight: 600, color: "var(--ink-soft, #4A4742)", opacity: 1 }}>
                {data.role}
              </span>
            </p>
          )}
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-1 overflow-y-auto" style={{ maxHeight: "55vh" }}>
          {loading && (
            <div className="py-10 text-center">
              <span className="marco-signature is-pulsing" style={{ fontSize: "2.4rem" }}>marco</span>
              <p
                className="mt-3 text-[13px]"
                style={{
                  fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                  fontStyle: "italic",
                  color: "var(--ink-soft, #4A4742)",
                }}
              >
                Thinking through the role…
              </p>
            </div>
          )}

          {!loading && error && (
            <div
              className="p-3 rounded-xl text-sm"
              style={{
                background: "rgba(229, 70, 46, 0.08)",
                color: "var(--tomato-dark, #B8331E)",
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && data && data.options.length === 0 && (
            <p
              className="py-6 text-center text-sm"
              style={{
                fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                fontStyle: "italic",
                color: "var(--ink-soft, #4A4742)",
              }}
            >
              No good substitutes here — this one&apos;s doing too much specific work.
            </p>
          )}

          {!loading && !error && data && data.options.length > 0 && (
            <div className="space-y-2">
              {data.options.map((opt, i) => (
                <SubstitutionRow key={i} option={opt} />
              ))}
            </div>
          )}
        </div>

        {/* Footer — placeholder for the standing-pref hookup in Phase 2. */}
        <div className="px-5 pt-3 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-[13px] font-medium transition-colors"
            style={{ color: "var(--ink-soft, #4A4742)" }}
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes subSheetIn {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function SubstitutionRow({ option }: { option: SubstitutionOption }) {
  const isBest = option.quality === "best";
  const amountLabel = [option.amount, option.unit].filter(Boolean).join(" ").trim();

  return (
    <div
      className="relative rounded-xl"
      style={{
        background: "#fff",
        padding: "12px 14px 14px 16px",
        border: isBest
          ? "1.5px solid var(--teal, #0F4C5C)"
          : "1px solid var(--line, rgba(28,26,23,0.10))",
      }}
    >
      {isBest && (
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 bottom-0 rounded-l-xl"
          style={{ width: 3, background: "var(--teal, #0F4C5C)" }}
        />
      )}

      <div className="flex items-baseline justify-between gap-3">
        <p
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 30, "SOFT" 100, "wght" 500',
            fontSize: "16px",
            color: "var(--ink, #1C1A17)",
            lineHeight: 1.25,
          }}
        >
          {option.name}
        </p>
        {isBest && (
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: "var(--cream-warm, #EFE5D2)",
              color: "var(--teal, #0F4C5C)",
              letterSpacing: "0.1em",
            }}
          >
            Best
          </span>
        )}
      </div>

      {amountLabel && (
        <p
          className="mt-1 text-[13px]"
          style={{
            color: "var(--ink-soft, #4A4742)",
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
          }}
        >
          {amountLabel}
          {option.ratioNote ? ` · ${option.ratioNote}` : ""}
        </p>
      )}

      <p
        className="mt-1.5 text-[12.5px] leading-snug"
        style={{
          fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
          fontStyle: "italic",
          fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
          color: "var(--ink-soft, #4A4742)",
          opacity: 0.9,
        }}
      >
        {option.reasoning}
      </p>
    </div>
  );
}
