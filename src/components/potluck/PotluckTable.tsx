"use client";

/* The table, seen from above, filling up.
 *
 * The spread of photo tiles below says WHAT is coming. This says how the week
 * is going, at a glance. Three states, and they have to be told apart in one
 * look at 40px:
 *
 *   cooked   — a plate in a brand colour, solid edge
 *   promised — an empty white plate, solid edge: laid, not filled
 *   spare    — a faint dashed ring: not a plate at all, just room for one
 *
 * The first version drew promised plates dashed too, which made them
 * indistinguishable from the empty spaces beside them.
 *
 * Drawn, not photographed, on purpose. Dish photos come from Supabase storage
 * and from whatever CDN a recipe was imported from, so a canvas containing
 * them would be tainted and could not be exported — and the share card (see
 * shareCard.ts) is the point of having one composition. Plates in the brand's
 * own colours also survive being 40px wide, which a photo of a curry does not.
 */

import { BUTTER, CREAM_WARM, DISPLAY, INK, INK_SOFT, LAV, LIME, MUSTARD_SOFT, PAPER, PINK } from "@/lib/theme";

export type TablePlate = { id: string; label: string; who: string; cooked: boolean };

/** Light stickers, in a fixed order so a dish keeps its colour between renders. */
export const PLATE_COLOURS = [LIME, BUTTER, LAV, MUSTARD_SOFT, PINK, CREAM_WARM];

/** Past this the plates start touching, so the rest become one "+N". */
const MAX_PLATES = 11;

export function plateLayout(count: number) {
  const shown = Math.min(count, MAX_PLATES);
  const withSpares = shown;
  const radius = withSpares <= 6 ? 30 : withSpares <= 9 ? 26 : 22;
  return { shown, radius, overflow: Math.max(0, count - MAX_PLATES) };
}

/** Where plate `i` of `n` sits, starting at the top and going clockwise. */
export function platePos(i: number, n: number, ring: number, cx: number, cy: number) {
  const angle = ((-90 + (360 / Math.max(n, 1)) * i) * Math.PI) / 180;
  return { x: cx + ring * Math.cos(angle), y: cy + ring * Math.sin(angle) };
}

export default function PotluckTable({ plates, open, centre }: {
  plates: TablePlate[];
  /** An open potluck shows room for more; a served one is as full as it got. */
  open: boolean;
  centre: string;
}) {
  // Two dashed spaces while there is still time, so an empty table reads as an
  // invitation rather than a failure.
  const spares = open ? 2 : 0;
  const total = Math.min(plates.length, MAX_PLATES) + spares;
  const { radius, overflow } = plateLayout(plates.length);
  const CX = 160, CY = 160, RING = 104;

  return (
    <svg viewBox="0 0 320 320" role="img" aria-label={`${plates.length} ${plates.length === 1 ? "dish" : "dishes"} on the table`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* the tabletop */}
      <circle cx={CX} cy={CY} r={128} fill={CREAM_WARM} stroke={INK} strokeWidth={2.5} />
      <circle cx={CX} cy={CY} r={118} fill="none" stroke={INK} strokeWidth={1} opacity={0.25} />

      {/* the count, in the middle of the table */}
      <text x={CX} y={CY - 2} textAnchor="middle" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, fill: INK }}>{plates.length}</text>
      <text x={CX} y={CY + 20} textAnchor="middle" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, fill: INK_SOFT, letterSpacing: "0.06em" }}>{centre}</text>

      {plates.slice(0, MAX_PLATES).map((p, i) => {
        const { x, y } = platePos(i, total, RING, CX, CY);
        const fill = p.cooked ? PLATE_COLOURS[i % PLATE_COLOURS.length] : PAPER;
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={radius} fill={fill} stroke={INK} strokeWidth={2.2} />
            <text x={x} y={y + 5} textAnchor="middle" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: radius * 0.62, fill: INK, opacity: p.cooked ? 1 : 0.55 }}>
              {p.label.slice(0, 1).toUpperCase()}
            </text>
          </g>
        );
      })}

      {overflow > 0 && (() => {
        const { x, y } = platePos(MAX_PLATES - 1, total, RING, CX, CY);
        return <text key="more" x={x} y={y + radius + 14} textAnchor="middle" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, fill: INK_SOFT }}>+{overflow}</text>;
      })()}

      {Array.from({ length: spares }, (_, k) => {
        const { x, y } = platePos(Math.min(plates.length, MAX_PLATES) + k, total, RING, CX, CY);
        return <circle key={`spare${k}`} cx={x} cy={y} r={radius} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="3 6" opacity={0.4} />;
      })}
    </svg>
  );
}
