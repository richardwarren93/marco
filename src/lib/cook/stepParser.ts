import type { Ingredient } from "@/types";

/**
 * Step parser v1 — tokenizes a step string into text, durations, and
 * ingredient references so the now-playing card can render inline timer
 * chips and amount chips. Phase 1 of the Cook with Marco design spec.
 *
 * Deliberately simple. Two passes (durations + ingredient names), then a
 * resolver that drops overlapping matches favoring the longer/earlier span.
 * Good enough to make the now-playing view feel useful day-one without
 * pulling in NLP. The role-aware ingredient tagging from the spec lands in
 * a later phase.
 */

export type StepToken =
  | { type: "text"; content: string }
  | { type: "duration"; seconds: number; label: string }
  | { type: "ingredient"; name: string; amount: string; unit: string; matchedText: string };

type RawDurationMatch = {
  start: number;
  end: number;
  token: { type: "duration"; seconds: number; label: string };
};
type RawIngredientMatch = {
  start: number;
  end: number;
  token: { type: "ingredient"; name: string; amount: string; unit: string; matchedText: string };
};
type RawMatch = RawDurationMatch | RawIngredientMatch;

// ─── Duration patterns ────────────────────────────────────────────────────
//
// Match common duration forms in step text. We restrict to multi-letter
// abbreviations (no bare "m" / "h" / "s") to avoid false positives like
// "1 m" being interpreted as 1 minute when it's actually meters or part of
// an unrelated phrase. Examples that should match:
//   "8 min", "8 minutes", "30 sec", "30 seconds", "1 hour", "1 hr",
//   "5-10 minutes" (uses upper bound), "1.5 hours", "an hour"
const DURATION_RE = new RegExp(
  [
    // 5-10 minutes (range — use upper bound)
    "(?:(\\d+(?:\\.\\d+)?)\\s*[\\-\\u2013]\\s*)?", // optional lower bound
    "(\\d+(?:\\.\\d+)?)\\s*",                       // primary number
    "(hours?|hrs?|minutes?|mins?|seconds?|secs?)",  // unit
    "\\b",
  ].join(""),
  "gi",
);

function unitToSeconds(unit: string, value: number): number {
  const u = unit.toLowerCase();
  if (u.startsWith("h")) return Math.round(value * 3600);
  if (u.startsWith("m")) return Math.round(value * 60);
  return Math.round(value);
}

// Pretty label like "8 min" or "1 hr 30 min" or "30 sec".
export function formatDurationLabel(seconds: number): string {
  if (seconds <= 0) return "0 sec";
  if (seconds < 60) return `${seconds} sec`;
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return `${m} min`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds - h * 3600) / 60);
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

// MM:SS or H:MM:SS for live countdown chips.
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s - h * 3600) / 60);
  const sec = s - h * 3600 - m * 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

function findDurations(text: string): RawMatch[] {
  const matches: RawMatch[] = [];
  for (const m of text.matchAll(DURATION_RE)) {
    const lower = m[1] ? parseFloat(m[1]) : null;
    const upper = parseFloat(m[2]);
    const unit = m[3];
    // For ranges, prefer the upper bound — closer to "the time you'll
    // actually spend" than splitting the difference.
    const value = upper;
    const seconds = unitToSeconds(unit, value);
    if (seconds <= 0) continue;
    const label = lower !== null
      ? `${lower}-${upper} ${unit}`
      : `${m[2]} ${unit}`;
    matches.push({
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
      token: { type: "duration", seconds, label },
    });
  }
  return matches;
}

// ─── Ingredient name matching ─────────────────────────────────────────────
//
// For each ingredient, look for occurrences of its name in the step text
// (case-insensitive, word-bounded). Multi-word names ("egg whites") match
// as phrases. Longer names take priority over shorter when they overlap
// ("egg whites" beats "eggs" if both could match the same span).

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Strip leading articles / parentheticals from ingredient names so
// "(optional) cilantro" still matches "cilantro" in step text.
function normalizeName(name: string): string {
  return name
    .replace(/^\s*(\(.*?\))?\s*/i, "")
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
}

function findIngredients(text: string, ingredients: Ingredient[]): RawMatch[] {
  const matches: RawMatch[] = [];
  // Sort longer names first so phrase matches win over single-word ones.
  const sorted = [...ingredients]
    .map((ing) => ({ ing, normalized: normalizeName(ing.name) }))
    .filter((entry) => entry.normalized.length >= 3) // skip ultra-short noise
    .sort((a, b) => b.normalized.length - a.normalized.length);

  for (const { ing, normalized } of sorted) {
    if (!normalized) continue;
    const re = new RegExp(`\\b${escapeRegex(normalized)}\\b`, "gi");
    for (const m of text.matchAll(re)) {
      matches.push({
        start: m.index ?? 0,
        end: (m.index ?? 0) + m[0].length,
        token: {
          type: "ingredient",
          name: ing.name,
          amount: ing.amount ?? "",
          unit: ing.unit ?? "",
          matchedText: m[0],
        },
      });
    }
  }
  return matches;
}

// ─── Overlap resolver ─────────────────────────────────────────────────────
//
// If two matches overlap, keep the longer one; if equal length, keep the
// earlier. Durations beat ingredients on ties (a number-with-unit is a
// stronger signal than an incidental noun match).

function resolveOverlaps(matches: RawMatch[]): RawMatch[] {
  const sorted = [...matches].sort((a, b) => {
    const lenA = a.end - a.start;
    const lenB = b.end - b.start;
    if (lenA !== lenB) return lenB - lenA;
    if (a.token.type !== b.token.type) {
      return a.token.type === "duration" ? -1 : 1;
    }
    return a.start - b.start;
  });
  const accepted: RawMatch[] = [];
  for (const m of sorted) {
    const conflict = accepted.some((a) => m.start < a.end && a.start < m.end);
    if (!conflict) accepted.push(m);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

// ─── Public parser ────────────────────────────────────────────────────────

export function parseStep(text: string, ingredients: Ingredient[]): StepToken[] {
  const raw = [...findDurations(text), ...findIngredients(text, ingredients)];
  const resolved = resolveOverlaps(raw);

  if (resolved.length === 0) return [{ type: "text", content: text }];

  const tokens: StepToken[] = [];
  let cursor = 0;
  for (const m of resolved) {
    if (m.start > cursor) {
      tokens.push({ type: "text", content: text.slice(cursor, m.start) });
    }
    if (m.token.type === "duration") {
      tokens.push({ type: "duration", seconds: m.token.seconds, label: m.token.label });
    } else {
      tokens.push({
        type: "ingredient",
        name: m.token.name,
        amount: m.token.amount,
        unit: m.token.unit,
        matchedText: m.token.matchedText,
      });
    }
    cursor = m.end;
  }
  if (cursor < text.length) {
    tokens.push({ type: "text", content: text.slice(cursor) });
  }
  return tokens;
}
