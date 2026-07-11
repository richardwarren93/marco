"use client";

import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import { useToast } from "@/components/ui/Toast";

interface ReviewRecipe {
  id: string;
  title: string;
  image_url: string | null;
  times: number;
}
interface ReviewData {
  weekStart: string;
  weekEnd: string;
  recipes: ReviewRecipe[];
  distinctCount: number;
  totalCooks: number;
  tomatoesEarned: number;
}

const TITLE_STYLE = {
  fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
  fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
  fontSize: "19px",
  letterSpacing: "-0.015em",
  color: "var(--ink, #1C1A17)",
} as const;

function rangeLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6); // Sunday
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function WeeklyReviewCard() {
  const { data } = useSWR<ReviewData>("/api/cooking-review", apiFetcher, { revalidateOnFocus: false });
  const { showToast } = useToast();

  // Also bail on error payloads (e.g. a 401 body) — destructure only real data.
  if (!data || !Array.isArray(data.recipes)) return null;

  const { recipes, distinctCount, totalCooks, tomatoesEarned } = data;
  const empty = distinctCount === 0;

  async function handleShare() {
    if (!data) return;
    const titles = data.recipes.map((r) => r.title).slice(0, 5);
    const text = `Last week I cooked ${distinctCount} ${distinctCount === 1 ? "meal" : "meals"} on Marco${titles.length ? ` — ${titles.join(", ")}` : ""} 🍅`;
    const url = window.location.origin;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "My week of cooking · Marco", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showToast("Copied — paste it anywhere", { variant: "success" });
      }
    } catch {
      /* user cancelled the share sheet */
    }
  }

  return (
    <div
      className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <div>
          <h2 style={TITLE_STYLE}>Last week&apos;s cooking</h2>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#a09890" }}>
            {rangeLabel(data.weekStart)}
          </p>
        </div>
        {!empty && (
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[13px] font-semibold active:scale-[0.97] transition-transform"
            style={{ background: "var(--tomato, #E5462E)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4M18 8a3 3 0 10-3-3 3 3 0 003 3zM6 15a3 3 0 103-3 3 3 0 00-3 3zM18 22a3 3 0 10-3-3 3 3 0 003 3z" />
            </svg>
            Share
          </button>
        )}
      </div>

      {empty ? (
        <p className="px-4 pb-4 pt-2 text-sm" style={{ color: "#6B655C" }}>
          No cooks logged last week — confirm meals on your plan this week and they&apos;ll show up here.
        </p>
      ) : (
        <>
          {/* Stats */}
          <div className="flex items-center gap-4 px-4 pt-2 pb-3">
            <Stat value={String(totalCooks)} label={totalCooks === 1 ? "meal cooked" : "meals cooked"} />
            <Stat value={String(distinctCount)} label={distinctCount === 1 ? "recipe" : "recipes"} />
            <Stat value={`+${tomatoesEarned}`} label="tomatoes" accent />
          </div>

          {/* Recipe thumbnails */}
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-4 no-scrollbar">
            {recipes.map((r) => (
              <div key={r.id} className="flex-shrink-0" style={{ width: 76 }}>
                <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "1 / 1", background: "#E5D5B0" }}>
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt={r.title} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                  )}
                  {r.times > 1 && (
                    <span className="absolute top-1 right-1 text-white text-[10px] font-bold rounded-full px-1.5" style={{ background: "var(--tomato, #E5462E)" }}>
                      ×{r.times}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-tight line-clamp-2" style={{ color: "var(--ink, #1C1A17)" }}>{r.title}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl marco-h1" style={{ color: accent ? "var(--tomato, #E5462E)" : "#1C1A17" }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#a09890" }}>{label}</span>
    </div>
  );
}
