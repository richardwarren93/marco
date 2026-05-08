"use client";

import { useEffect, useState } from "react";
import { mutate as swrMutate } from "swr";
import { DIETARY_FILTERS, type DietaryFilterId } from "@/lib/cook/dietary";

/**
 * Profile-level dietary toggles (Phase 2). Multi-select chips backed by
 * /api/user/dietary. Saving a change kicks SWR for the same endpoint so the
 * recipe detail and meal plan view re-render their "needs swap" markers
 * without a hard reload.
 */
export default function DietaryFiltersCard() {
  const [active, setActive] = useState<Set<DietaryFilterId>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/dietary")
      .then((r) => r.json())
      .then((data: { filters?: string[] }) => {
        if (cancelled) return;
        const ids = (data.filters ?? []).filter((id): id is DietaryFilterId =>
          DIETARY_FILTERS.some((f) => f.id === id),
        );
        setActive(new Set(ids));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  async function toggle(id: DietaryFilterId) {
    if (saving) return;
    setError("");
    const next = new Set(active);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    // Optimistic update — flip the chip immediately, roll back if the save
    // fails. Filters are cheap to recompute so the brief stale state is fine.
    setActive(next);
    setSaving(true);
    try {
      const res = await fetch("/api/user/dietary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: Array.from(next) }),
      });
      if (!res.ok) throw new Error("save failed");
      // Refresh consumers (recipe detail, meal plan view).
      swrMutate("/api/user/dietary");
    } catch {
      setActive(active);
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <h3
          className="text-[15px] font-semibold"
          style={{ color: "var(--ink, #1C1A17)" }}
        >
          Dietary filters
        </h3>
        {saving && (
          <span className="text-[11px]" style={{ color: "var(--ink-soft, #4A4742)" }}>
            Saving…
          </span>
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
        Recipes with ingredients that don&apos;t fit will show a &quot;needs swap&quot; tag.
      </p>

      {!loaded ? (
        <div className="py-3 text-center text-[12px]" style={{ color: "var(--ink-soft, #4A4742)" }}>
          Loading…
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_FILTERS.map((filter) => {
            const on = active.has(filter.id);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => toggle(filter.id)}
                disabled={saving}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60"
                style={{
                  background: on ? "var(--tomato, #E5462E)" : "#fff",
                  color: on ? "#fff" : "var(--ink, #1C1A17)",
                  borderColor: on ? "var(--tomato, #E5462E)" : "rgba(28,26,23,0.12)",
                }}
                title={filter.description}
                aria-pressed={on}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--tomato-dark, #B8331E)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
