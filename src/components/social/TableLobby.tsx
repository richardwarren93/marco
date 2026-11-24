"use client";

/* Your tables, as a lobby browser.
 *
 * This replaced a <select> and a single card that rotated through your tables
 * on a timer. Both hid the thing you actually want to see: who is at each
 * table, and what is on there. A dropdown is a form control for choosing one
 * of many values; a lobby is a list of rooms you can look into.
 *
 * So every table is a card, every card shows its people as faces, and the
 * potluck line says what is happening in that room right now. Tapping one
 * filters the feed to it; tapping it again goes back to all of them.
 */

import Link from "next/link";
import type { Crew, TableMember } from "@/lib/social";
import { deadlineLabel, isServed, localISO } from "@/lib/potluck";
import { BUTTER, CREAM_WARM, DISPLAY, HAND, INK, INK_MUTED, INK_SOFT, LAV, LIME, MUSTARD_SOFT, PAPER, TOMATO } from "@/lib/theme";

const DISP = DISPLAY;

export type LobbyPotluck = {
  id: string; crew_id: string; theme: string; emoji: string | null;
  deadline: string | null; status: string;
  submissions: { id: string; user_id: string }[];
};

/* The app's four light stickers, picked by name hash — the same convention as
   the household card, the notification sheet and the share modal, so a face is
   the same colour wherever you meet it. */
const STICKERS = [BUTTER, LIME, LAV, MUSTARD_SOFT];
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export default function TableLobby({ tables, potlucks, coCooks, myId, selected, onSelect, onNew }: {
  tables: { crew: Crew; members: TableMember[] }[];
  potlucks: LobbyPotluck[];
  coCooks: Record<string, string>;
  myId: string | null;
  selected: string;
  onSelect: (crewId: string) => void;
  onNew: () => void;
}) {
  const today = localISO();

  return (
    <section aria-label="Your tables" style={{ marginTop: 14 }}>
      <div className="flex items-baseline justify-between px-1" style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>your tables</span>
        {selected && (
          <button onClick={() => onSelect("")} style={{ fontFamily: HAND, fontSize: 14.5, color: TOMATO, background: "none", border: "none", padding: 0 }}>
            show all →
          </button>
        )}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {tables.map(({ crew, members }) => {
          const on = selected === crew.id;
          const live = potlucks.find((p) => p.crew_id === crew.id && !isServed(p, today));
          const mine = !!myId && !!live && live.submissions.some((s) => s.user_id === myId || coCooks[s.id] === myId);
          return (
            <div key={crew.id}
              style={{
                background: on ? CREAM_WARM : PAPER, border: `2.5px solid ${INK}`, borderRadius: 16,
                boxShadow: on ? `2px 2px 0 ${INK}` : `4px 5px 0 ${INK}`,
                transform: on ? "translate(2px,3px)" : "none",
                overflow: "hidden",
              }}>
              <button
                onClick={() => onSelect(on ? "" : crew.id)}
                aria-pressed={on}
                className="w-full text-left"
                style={{ background: "none", border: "none", padding: "13px 14px 0", display: "block" }}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK }}>
                    {crew.emoji ?? "🍽️"} {crew.name}
                  </span>
                  <span className="flex-shrink-0" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 11.5, letterSpacing: "0.04em", color: INK_SOFT }}>
                    {members.length} seated
                  </span>
                </div>

                {/* the faces — the point of a lobby */}
                <div className="flex items-center" style={{ marginTop: 10, paddingBottom: 12 }}>
                  {members.slice(0, 6).map((m, i) => (
                    <span key={m.id} title={m.isYou ? "you" : m.name}
                      className="flex items-center justify-center"
                      style={{
                        width: 34, height: 34, borderRadius: 99, flexShrink: 0,
                        background: STICKERS[hash(m.name || m.id) % STICKERS.length],
                        border: `2.5px solid ${INK}`, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 14,
                        // Overlapped, like a party rather than a table of contents.
                        marginLeft: i === 0 ? 0 : -9,
                        transform: `rotate(${i % 2 ? 4 : -4}deg)`,
                        zIndex: 10 - i,
                      }}>
                      {m.avatar || (m.isYou ? "Y" : (m.name || "?").slice(0, 1).toUpperCase())}
                    </span>
                  ))}
                  {members.length > 6 && (
                    <span style={{ fontFamily: HAND, fontSize: 14, color: INK_SOFT, marginLeft: 8 }}>+{members.length - 6}</span>
                  )}
                  {members.length < 2 && (
                    <span style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, marginLeft: 10 }}>just you so far</span>
                  )}
                </div>
              </button>

              {/* what is on in this room */}
              <Link
                href={live ? `/potluck/${live.id}` : `/potluck?table=${encodeURIComponent(crew.id)}`}
                className="block active:scale-[0.99] transition-transform"
                style={{ background: live ? BUTTER : "transparent", borderTop: `2px solid ${INK}`, padding: "10px 14px", textDecoration: "none" }}
              >
                {live ? (
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13.5, color: INK }}>
                      {live.emoji ?? "🍲"} {live.theme}
                    </span>
                    <span className="flex-shrink-0" style={{ background: mine ? LIME : PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 10.5, letterSpacing: "0.04em", padding: "3px 8px", borderRadius: 99, border: `2px solid ${INK}` }}>
                      {deadlineLabel(live, today)}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontFamily: HAND, fontSize: 14.5, color: INK_MUTED }}>no potluck on — start one →</span>
                )}
              </Link>
            </div>
          );
        })}

        <button onClick={onNew} className="active:scale-[0.99] transition-transform"
          style={{ background: "transparent", border: `2.5px dashed ${INK}`, borderRadius: 16, padding: "14px 0", fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, opacity: 0.75 }}>
          + new table
        </button>
      </div>
    </section>
  );
}
