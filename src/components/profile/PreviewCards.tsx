"use client";

import Link from "next/link";

/* Profile hub feature cards — simple, in-style, and each background is a real
   preview of what's inside: the Taste DNA card renders your flavor profile as
   a radar chart; the Badges card shows your actual earned badges. */

const CARD_STYLE = {
  background: "#FFFDF7",
  border: "1px solid rgba(28,26,23,0.1)",
  boxShadow: "0 2px 12px rgba(28,26,23,0.05)",
} as const;

const TITLE_STYLE = {
  fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
  fontVariationSettings: '"opsz" 40, "SOFT" 100, "wght" 600',
  fontSize: "16px",
  letterSpacing: "-0.01em",
  color: "#1C1A17",
} as const;

const VIEW_STYLE = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#1C1A17",
} as const;

type Scores = { sweet: number; savory: number; richness: number; tangy: number; spicy: number };

// Pentagon order around the radar + the word each dim contributes to the
// one-line read ("Rich, bold, and deeply savory.").
const DIMS: { key: keyof Scores; word: string }[] = [
  { key: "savory", word: "savory" },
  { key: "sweet", word: "sweet" },
  { key: "spicy", word: "fiery" },
  { key: "tangy", word: "bright" },
  { key: "richness", word: "rich" },
];

function radarPoint(i: number, r: number, cx: number, cy: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / DIMS.length;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function polygon(r: (i: number) => number, cx: number, cy: number): string {
  return DIMS.map((_, i) => radarPoint(i, r(i), cx, cy).map((n) => n.toFixed(1)).join(",")).join(" ");
}

function TasteRadar({ scores }: { scores: Scores }) {
  const CX = 62, CY = 58, R = 46;
  return (
    <svg viewBox="0 0 124 116" width="124" height="116" aria-hidden>
      {/* Web rings + spokes */}
      {[1 / 3, 2 / 3, 1].map((lvl) => (
        <polygon key={lvl} points={polygon(() => R * lvl, CX, CY)} fill="none" stroke="rgba(28,26,23,0.12)" strokeWidth="0.75" />
      ))}
      {DIMS.map((_, i) => {
        const [x, y] = radarPoint(i, R, CX, CY);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(28,26,23,0.1)" strokeWidth="0.75" />;
      })}
      {/* The profile itself */}
      <polygon
        points={polygon((i) => R * Math.max(scores[DIMS[i].key] ?? 0, 10) / 100, CX, CY)}
        fill="rgba(232,163,61,0.32)"
        stroke="#b45309"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TastePreviewCard({ scores }: { scores: Scores | null }) {
  const hasData = !!scores && Object.values(scores).some((v) => v > 0);

  // "Rich, bold, and deeply savory." — second dim leads, top dim closes.
  let sentence: string | null = null;
  if (hasData) {
    const sorted = DIMS.slice().sort((a, b) => (scores![b.key] ?? 0) - (scores![a.key] ?? 0));
    const first = sorted[0].word;
    const second = sorted[1].word;
    sentence = `Your cooking is ${second}, bold, and deeply ${first}.`;
  }

  return (
    <Link href="/profile/taste" className="flex flex-col rounded-2xl p-4 active:scale-[0.98] transition-transform" style={CARD_STYLE}>
      <p style={TITLE_STYLE}>Taste DNA</p>
      <div className="flex-1 flex items-center justify-center py-1.5">
        {hasData ? (
          <TasteRadar scores={scores!} />
        ) : (
          <span className="text-4xl" aria-hidden>🧬</span>
        )}
      </div>
      <p
        className="mb-2"
        style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "12px", lineHeight: 1.4, color: "#4A4742" }}
      >
        {sentence ?? "Rank a few dinners and we'll map your taste."}
      </p>
      <p style={VIEW_STYLE}>{hasData ? "View full profile" : "Build yours"} →</p>
    </Link>
  );
}

export function BadgesPreviewCard({ earned, total, icons }: { earned?: number; total?: number; icons: string[] }) {
  const hasData = !!total;
  // Six slots: earned badge icons first, faint empty slots for the rest.
  const slots = Array.from({ length: 6 }, (_, i) => icons[i] ?? null);

  return (
    <Link href="/profile/badges" className="flex flex-col rounded-2xl p-4 active:scale-[0.98] transition-transform" style={CARD_STYLE}>
      <p style={TITLE_STYLE}>Badges</p>
      <div className="flex-1 flex items-center justify-center py-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          {slots.map((icon, i) =>
            icon ? (
              <span
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[15px]"
                style={{ background: "rgba(232,163,61,0.16)", border: "1px solid rgba(232,163,61,0.4)" }}
                aria-hidden
              >
                {icon}
              </span>
            ) : (
              <span key={i} className="w-8 h-8 rounded-full" style={{ border: "1.5px dashed rgba(28,26,23,0.14)" }} aria-hidden />
            ),
          )}
        </div>
      </div>
      <p
        className="mb-2"
        style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "12px", lineHeight: 1.4, color: "#4A4742" }}
      >
        {hasData ? `${earned ?? 0} of ${total} earned — keep cooking.` : "Cook, save, and share to earn your first."}
      </p>
      <p style={VIEW_STYLE}>{hasData ? "View all badges" : "Start earning"} →</p>
    </Link>
  );
}
