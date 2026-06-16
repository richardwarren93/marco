"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Profile-level food allergies. Backed by /api/user/allergies (the same
 * user_preferences.allergies the onboarding step writes), so a user can review
 * and edit what they entered during onboarding. Common allergies are toggle
 * chips; anything else is a free-text custom chip. Every change saves the full
 * array (optimistic, rolls back on failure).
 */

const COMMON_ALLERGIES = [
  "Peanuts", "Tree Nuts", "Dairy", "Gluten",
  "Shellfish", "Eggs", "Soy", "Fish",
];

export default function AllergiesCard() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [custom, setCustom] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/allergies")
      .then((r) => r.json())
      .then((data: { allergies?: string[] }) => {
        if (cancelled) return;
        setSelected(Array.isArray(data.allergies) ? data.allergies : []);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  async function commit(next: string[]) {
    if (saving) return;
    setError("");
    const prev = selected;
    setSelected(next); // optimistic
    setSaving(true);
    try {
      const res = await fetch("/api/user/allergies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allergies: next }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setSelected(prev);
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const toggle = (allergy: string) => {
    if (saving) return;
    commit(
      selected.includes(allergy)
        ? selected.filter((a) => a !== allergy)
        : [...selected, allergy],
    );
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed || selected.includes(trimmed)) { setCustom(""); return; }
    setCustom("");
    commit([...selected, trimmed]);
  };

  const customAllergies = selected.filter((a) => !COMMON_ALLERGIES.includes(a));

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink, #1C1A17)" }}>
          Allergies
        </h3>
        {saving && (
          <span className="text-[11px]" style={{ color: "var(--ink-soft, #4A4742)" }}>Saving…</span>
        )}
      </div>
      <p
        className="text-[12.5px] mb-3"
        style={{
          color: "var(--ink-soft, #4A4742)",
          fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
          fontStyle: "italic",
          opacity: 0.85,
        }}
      >
        We&apos;ll keep these out of suggestions when you cook with Marco.
      </p>

      {!loaded ? (
        <div className="py-3 text-center text-[12px]" style={{ color: "var(--ink-soft, #4A4742)" }}>
          Loading…
        </div>
      ) : (
        <>
          {/* Custom input */}
          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="Add another…"
              className="flex-1 px-3 py-2 rounded-xl outline-none text-[13px]"
              style={{ background: "#fff", border: "1px solid rgba(28,26,23,0.14)", color: "var(--ink, #1C1A17)" }}
            />
            {custom.trim() && (
              <button
                onClick={addCustom}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl font-semibold text-[13px] text-white disabled:opacity-60"
                style={{ background: "var(--tomato, #E5462E)" }}
              >
                Add
              </button>
            )}
          </div>

          {/* Common allergies */}
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ALLERGIES.map((allergy) => {
              const on = selected.includes(allergy);
              return (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => toggle(allergy)}
                  disabled={saving}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60"
                  style={{
                    background: on ? "var(--tomato, #E5462E)" : "#fff",
                    color: on ? "#fff" : "var(--ink, #1C1A17)",
                    borderColor: on ? "var(--tomato, #E5462E)" : "rgba(28,26,23,0.12)",
                  }}
                  aria-pressed={on}
                >
                  {allergy}
                </button>
              );
            })}
          </div>

          {/* Custom chips (removable) */}
          {customAllergies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {customAllergies.map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full text-white"
                  style={{ background: "var(--tomato, #E5462E)" }}
                >
                  {allergy}
                  <button
                    onClick={() => toggle(allergy)}
                    disabled={saving}
                    aria-label={`Remove ${allergy}`}
                    className="w-3.5 h-3.5 rounded-full bg-white/30 flex items-center justify-center disabled:opacity-60"
                  >
                    <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--tomato-dark, #B8331E)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
