"use client";

import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import SubPageHeader from "@/components/layout/SubPageHeader";
import { useToast } from "@/components/ui/Toast";

/* Cooking history — every week gets its own section showing what you made
   (moved here from the profile hub's "Last week's cooking" card). Weeks are
   grouped under month dividers with monthly totals; those rollups are the
   same numbers the end-of-month recap will send. */

interface WeekRecipe {
  id: string;
  title: string;
  image_url: string | null;
  times: number;
}
interface Week {
  weekStart: string;
  recipes: WeekRecipe[];
  totalCooks: number;
  tomatoesEarned: number;
}
interface HistoryData {
  weeks: Week[];
  currentWeekStart: string;
}

const CARD_STYLE = {
  background: "#FFFDF7",
  border: "1px solid rgba(28,26,23,0.08)",
  boxShadow: "0 2px 12px rgba(28,26,23,0.05)",
} as const;

function fmtUTC(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

function rangeLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startStr = fmtUTC(start, { month: "short", day: "numeric" });
  const endStr = fmtUTC(end, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startStr} – ${endStr}`;
}

function monthLabel(weekStart: string): string {
  return fmtUTC(new Date(weekStart + "T00:00:00Z"), { month: "long", year: "numeric" });
}

function prevMonday(currentWeekStart: string): string {
  const d = new Date(currentWeekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function CookingHistoryPage() {
  const { data, isLoading } = useSWR<HistoryData>("/api/cooking-history", apiFetcher, {
    revalidateOnFocus: false,
  });
  const { showToast } = useToast();

  const weeks = Array.isArray(data?.weeks) ? data!.weeks : [];
  const currentWk = data?.currentWeekStart ?? "";
  const lastWk = currentWk ? prevMonday(currentWk) : "";

  // Monthly rollups (keyed by the month of each week's Monday) — the same
  // numbers the monthly recap will report.
  const monthTotals = new Map<string, number>();
  for (const w of weeks) {
    const m = monthLabel(w.weekStart);
    monthTotals.set(m, (monthTotals.get(m) ?? 0) + w.totalCooks);
  }

  async function shareWeek(week: Week) {
    const titles = week.recipes.map((r) => r.title).slice(0, 5);
    const text = `In the week of ${fmtUTC(new Date(week.weekStart + "T00:00:00Z"), { month: "short", day: "numeric" })}, I cooked ${week.totalCooks} ${week.totalCooks === 1 ? "meal" : "meals"} on Marco${titles.length ? ` — ${titles.join(", ")}` : ""} 🍅`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "My week of cooking · Marco", text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
        showToast("Copied — paste it anywhere", { variant: "success" });
      }
    } catch {
      /* user cancelled the share sheet */
    }
  }

  let lastMonthShown = "";

  return (
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <SubPageHeader title="Cooking history" />

      <div className="max-w-lg mx-auto px-4 pt-1" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-8 skeleton-warm rounded-xl w-40" />
            <div className="h-36 skeleton-warm rounded-2xl" />
            <div className="h-36 skeleton-warm rounded-2xl" />
          </div>
        ) : weeks.length === 0 ? (
          <div className="text-center py-14 rounded-2xl px-6" style={CARD_STYLE}>
            <span className="text-4xl block mb-3">🍳</span>
            <p className="font-semibold text-[15px]" style={{ color: "#1C1A17" }}>No cooks logged yet</p>
            <p className="text-[13px] mt-1.5" style={{ color: "#6B655C" }}>
              Confirm meals with &ldquo;Cooked it&rdquo; and every week will show up here.
            </p>
          </div>
        ) : (
          weeks.map((week) => {
            const month = monthLabel(week.weekStart);
            const showMonth = month !== lastMonthShown;
            lastMonthShown = month;
            const chip = week.weekStart === currentWk ? "This week" : week.weekStart === lastWk ? "Last week" : null;
            const distinct = week.recipes.length;

            return (
              <div key={week.weekStart}>
                {showMonth && (
                  <div className="flex items-baseline justify-between pt-4 pb-2 px-1">
                    <h2
                      style={{
                        fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                        fontVariationSettings: '"opsz" 40, "SOFT" 100, "wght" 600',
                        fontSize: "18px",
                        letterSpacing: "-0.01em",
                        color: "#1C1A17",
                      }}
                    >
                      {month}
                    </h2>
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#a09890" }}>
                      {monthTotals.get(month)} {monthTotals.get(month) === 1 ? "meal" : "meals"}
                    </span>
                  </div>
                )}

                <div className="rounded-2xl overflow-hidden mb-3" style={CARD_STYLE}>
                  {/* Week header */}
                  <div className="flex items-center gap-2 px-4 pt-3.5 pb-1">
                    <p className="text-[13px] font-semibold" style={{ color: "#1C1A17" }}>{rangeLabel(week.weekStart)}</p>
                    {chip && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(229,70,46,0.1)", color: "#B8331E" }}
                      >
                        {chip}
                      </span>
                    )}
                    <button
                      onClick={() => shareWeek(week)}
                      aria-label={`Share the week of ${rangeLabel(week.weekStart)}`}
                      className="ml-auto w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#E5462E" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4M18 8a3 3 0 10-3-3 3 3 0 003 3zM6 15a3 3 0 103-3 3 3 0 00-3 3zM18 22a3 3 0 10-3-3 3 3 0 003 3z" />
                      </svg>
                    </button>
                  </div>

                  {/* Stats line */}
                  <p className="px-4 pb-2.5 text-[11.5px]" style={{ color: "#8a8378" }}>
                    {week.totalCooks} {week.totalCooks === 1 ? "meal" : "meals"} · {distinct} {distinct === 1 ? "recipe" : "recipes"}
                    {week.tomatoesEarned > 0 && (
                      <span style={{ color: "#B8331E", fontWeight: 600 }}> · +{week.tomatoesEarned} 🍅</span>
                    )}
                  </p>

                  {/* Recipe thumbnails */}
                  <div className="flex gap-2.5 overflow-x-auto px-4 pb-4 scrollbar-hide">
                    {week.recipes.map((r) => (
                      <div key={r.id} className="flex-shrink-0" style={{ width: 76 }}>
                        <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "1 / 1", background: "#E5D5B0" }}>
                          {r.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.image_url} alt={r.title} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                          )}
                          {r.times > 1 && (
                            <span className="absolute top-1 right-1 text-white text-[10px] font-bold rounded-full px-1.5" style={{ background: "#E5462E" }}>
                              ×{r.times}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] leading-tight line-clamp-2" style={{ color: "#1C1A17" }}>{r.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
