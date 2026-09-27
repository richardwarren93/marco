"use client";

// Lightweight member profile — reached by tapping someone at your table or on a
// cook. Shows how much they cook and what. Cooks are RLS-scoped to tables you
// share, so you only ever see people you actually cook with.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUserCooks, type Cook } from "@/lib/social";
import CookCard from "@/components/social/CookCard";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const MONO = "ui-monospace, monospace";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MemberProfile() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const [cooks, setCooks] = useState<Cook[] | null>(null);

  useEffect(() => { if (id) getUserCooks(id).then(setCooks); }, [id]);

  const name = cooks?.find((c) => c.author_name)?.author_name ?? "this cook";
  const avatar = cooks?.find((c) => c.author_avatar)?.author_avatar ?? (name[0] ?? "?").toUpperCase();
  const total = cooks?.length ?? 0;
  const weekAgo = Date.now() - 7 * 864e5;
  const thisWeek = (cooks ?? []).filter((c) => new Date(c.created_at).getTime() >= weekAgo).length;

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />
      <div className="relative mx-auto w-full max-w-md px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 120 }}>
        <button onClick={() => router.back()} aria-label="Back" style={{ fontFamily: HAND, fontSize: 16, color: INK, background: "none", border: "none" }}>← back</button>

        {/* header */}
        <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
          <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 99, background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 28, border: `2.5px solid ${INK}`, transform: "rotate(-3deg)" }}>{avatar}</div>
          <div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color: INK, lineHeight: 1 }}>{name}</div>
            <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO, marginTop: 4 }}>
              {cooks === null ? "…" : total === 0 ? "no cooks yet" : `🍳 ${total} cook${total === 1 ? "" : "s"}${thisWeek > 0 ? ` · ${thisWeek} this week` : ""}`}
            </div>
          </div>
        </div>

        {/* their cooks */}
        {cooks === null ? (
          <div style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.5, marginTop: 24, textAlign: "center" }}>loading…</div>
        ) : total === 0 ? (
          <div style={{ marginTop: 24, background: PAPER, border: `2px dashed ${INK}`, borderRadius: 16, padding: "22px 18px", textAlign: "center", fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.7 }}>nothing on the table yet.</div>
        ) : (
          <>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: INK, textTransform: "uppercase", marginTop: 24, marginBottom: 10 }}>their cooks</div>
            <div className="space-y-5">
              {cooks.map((c) => (
                <div key={c.id}>
                  <CookCard treatment={c.card_treatment} photo={c.photo_url ?? ""} title={c.title ?? ""} note={c.note ?? ""} authorName={c.author_name ?? name} authorAvatar={c.author_avatar ?? avatar} timeLabel={timeAgo(c.created_at)} h={180} />
                  {c.source_recipe_id && (
                    <button onClick={() => router.push(`/recipes/${c.source_recipe_id}`)} className="w-full flex items-center justify-between active:scale-[0.99] transition-transform" style={{ marginTop: 12, background: "#FFD84D", border: `2px solid ${INK}`, borderRadius: 12, padding: "11px 14px" }}>
                      <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK }}>📖 see the recipe</span>
                      <span style={{ color: INK, fontSize: 18 }}>›</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
