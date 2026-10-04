"use client";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import TasteInterstitial from "@/components/onboarding/TasteInterstitial";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";

type Dish = { id: string; title: string | null; image_url?: string | null; photo_url?: string | null; source_recipe_id?: string | null; author_name?: string | null };
type HouseholdRecipe = { id: string; title: string | null; image_url: string | null; author_name: string; created_at: string };
interface KitchenData { name: string; recipeCount: number; cookCount: number; recipes: Dish[]; cooks: Dish[]; saved: Dish[]; householdRecipes: HouseholdRecipe[] }

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
type Member = { user_id: string; role: string; profile: { display_name?: string | null } | null };
interface HouseholdData { household: { id: string; name: string; invite_code: string; members: Member[] } | null }

const fetcher = async (url: string) => { const r = await fetch(url); const v = await r.json(); if (!r.ok) throw new Error(v.error || "Could not load."); return v; };

export default function KitchenHub() {
  const { data, error, mutate } = useSWR<KitchenData>("/api/kitchen", fetcher, { revalidateOnFocus: true, focusThrottleInterval: 30000 });
  const { data: hh } = useSWR<HouseholdData>("/api/household", fetcher, { revalidateOnFocus: false });
  const [showTaste, setShowTaste] = useState(false);
  useSWR("/api/user/taste", fetcher, { revalidateOnFocus: false, onSuccess: (v) => { if (v?.pending) setShowTaste(true); } });

  return (
    <div className="min-h-[100dvh]" style={{ background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px", color: INK }}>
      <div className="mx-auto w-full max-w-lg px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 120 }}>
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <div className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 23, letterSpacing: "-0.01em", color: INK, lineHeight: 1.05 }}>{data ? `${data.name}'s kitchen` : "Your kitchen"}</div>
            <div style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, transform: "rotate(-1deg)", marginTop: 2 }}>{data ? `${data.recipeCount} recipes · ${data.cookCount} cooks` : "make yourself at home"}</div>
          </div>
          <Link href="/profile" aria-label="Your profile" className="flex flex-shrink-0 items-center justify-center" style={{ width: 38, height: 38, borderRadius: 99, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, transform: "rotate(5deg)", border: `2px solid ${BUTTER}` }}>{data?.name.slice(0, 1).toUpperCase() ?? "·"}</Link>
        </div>

        <HouseholdBanner hh={hh} />

        {/* The three pieces of your kitchen — recipes here, plan & shop a tap away */}
        <div className="flex" style={{ marginTop: 16, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 4, gap: 4, boxShadow: "0 5px 12px rgba(23,20,16,0.1)" }}>
          <span className="flex-1 text-center" style={{ background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "10px 0", borderRadius: 10 }}>Recipes</span>
          <Link href="/meal-plan" className="flex-1 text-center active:scale-95 transition-transform" style={{ color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "10px 0", borderRadius: 10 }}>Meal plan</Link>
          <Link href="/grocery" className="flex-1 text-center active:scale-95 transition-transform" style={{ color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "10px 0", borderRadius: 10 }}>Groceries</Link>
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl bg-white p-4" style={{ border: `2px solid ${INK}` }}><p>{error.message}</p><button className="mt-2 underline" onClick={() => mutate()}>Try again</button></div>}
        {!data && !error && <p role="status" className="mt-6" style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.6 }}>loading your kitchen…</p>}

        {data && (
          <>
            {/* FRESH — a living feed of what your household just added */}
            {data.householdRecipes.length > 0 && (
              <section style={{ marginTop: 18 }}>
                <div className="flex items-baseline gap-2 px-1" style={{ marginBottom: 10 }}>
                  <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>fresh in your kitchen</span>
                  <span style={{ fontFamily: HAND, fontSize: 14.5, color: TOMATO, transform: "rotate(-3deg)", display: "inline-block" }}>just dropped 🔥</span>
                </div>
                <div className="space-y-3">
                  {data.householdRecipes.slice(0, 3).map((r, i) => <ShareCard key={r.id} r={r} i={i} />)}
                </div>
              </section>
            )}

            {/* RECIPES — the core of your kitchen */}
            <section style={{ marginTop: 20 }}>
              <div className="flex items-baseline justify-between px-1" style={{ marginBottom: 10 }}>
                <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>your recipes</span>
                <Link href="/recipes" style={{ fontFamily: HAND, fontSize: 15, color: TOMATO }}>all {data.recipeCount} →</Link>
              </div>
              {data.recipes.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {data.recipes.map((r) => (
                    <Link key={r.id} href={`/recipes/${r.id}`} className="block overflow-hidden" style={{ borderRadius: 12, border: `2px solid ${INK}`, background: PAPER, boxShadow: "0 6px 14px rgba(23,20,16,0.12)" }}>
                      {r.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_url} alt="" loading="lazy" style={{ width: "100%", height: 104, objectFit: "cover", display: "block", borderBottom: `2px solid ${INK}` }} />
                      ) : <div className="flex items-center justify-center" style={{ height: 104, background: "rgba(255,216,77,0.3)", fontSize: 30, borderBottom: `2px solid ${INK}` }}>🍳</div>}
                      <div style={{ padding: "8px 10px", fontFamily: DISP, fontWeight: 700, fontSize: 14, lineHeight: 1.1, color: INK }}>{r.title || "Recipe"}</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center" style={{ border: `2px dashed ${INK}`, borderRadius: 14, padding: "22px 16px", background: PAPER }}>
                  <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO }}>your collection starts here ✨</div>
                  <Link href="/connect/imessage" className="mt-3 inline-block" style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "11px 20px", borderRadius: 12, border: `2.5px solid ${INK}` }}>Text Marco a recipe →</Link>
                </div>
              )}
            </section>

            <ShelfSection title="want to cook" dishes={data.saved} empty="recipes you save from your tables land here" href="/friends-stack" action="visit your tables →" />
            <ShelfSection title="you cooked" dishes={data.cooks} empty="your own cooks show up here" href="/i-cooked" action="post a cook →" />
          </>
        )}
      </div>

      {showTaste && <TasteInterstitial onDone={() => setShowTaste(false)} />}
    </div>
  );
}

function HouseholdBanner({ hh }: { hh: HouseholdData | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!hh?.household) return null;
  const members = hh.household.members ?? [];
  const others = members.filter((m) => m.role !== "owner");
  const shared = members.length >= 2;
  const names = others.map((m) => m.profile?.display_name || "your housemate").join(" & ");
  const code = hh.household.invite_code;

  if (shared) {
    return (
      <div className="flex items-center gap-2" style={{ marginTop: 10, background: LIME, border: `2px solid ${INK}`, borderRadius: 11, padding: "7px 11px" }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>🍅</span>
        <span className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK }}>shared with {names}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2" style={{ marginTop: 10, background: PAPER, border: `2px solid ${INK}`, borderRadius: 11, padding: "7px 8px 7px 11px" }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>⏳</span>
      <span className="min-w-0 flex-1 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK }}>waiting for your household</span>
      <button onClick={() => { navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }} className="flex-shrink-0 active:scale-95 transition-transform" style={{ background: BUTTER, border: `1.5px solid ${INK}`, borderRadius: 8, padding: "4px 9px", fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 12, color: INK }}>
        {copied ? "copied!" : code}
      </button>
    </div>
  );
}

const SEAT_COLORS = [LIME, BUTTER, "#FF4D9D", "#C9B8FF"];
function ShareCard({ r, i }: { r: HouseholdRecipe; i: number }) {
  return (
    <Link href={`/recipes/${r.id}`} className="block active:scale-[0.99] transition-transform" style={{ position: "relative", background: PAPER, borderRadius: 12, padding: "10px 10px 12px", border: `2px solid ${INK}`, transform: `rotate(${i % 2 ? 0.5 : -0.5}deg)`, boxShadow: "0 8px 18px rgba(23,20,16,0.14)" }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <span className="flex flex-shrink-0 items-center justify-center" style={{ width: 24, height: 24, borderRadius: 99, background: SEAT_COLORS[i % SEAT_COLORS.length], color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 12, border: `1.5px solid ${INK}`, transform: "rotate(-4deg)" }}>{r.author_name.slice(0, 1).toUpperCase()}</span>
        <span style={{ fontFamily: SANS, fontSize: 13, color: INK }}><b>{r.author_name}</b> added · {timeAgo(r.created_at)}</span>
      </div>
      {r.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.image_url} alt="" loading="lazy" style={{ width: "100%", height: 150, objectFit: "cover", display: "block", borderRadius: 8, border: `2px solid ${INK}` }} />
      ) : <div className="flex items-center justify-center" style={{ height: 150, background: "rgba(255,216,77,0.3)", fontSize: 40, borderRadius: 8, border: `2px solid ${INK}` }}>🍳</div>}
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK, lineHeight: 1.05, marginTop: 9 }}>{r.title || "Recipe"}</div>
      <svg width="150" height="10" viewBox="0 0 150 10" fill="none" aria-hidden style={{ marginTop: 3 }}><path d="M2 6 C 26 2, 50 9, 76 5 S 128 2, 148 5" stroke={TOMATO} strokeWidth="3" strokeLinecap="round" /></svg>
    </Link>
  );
}

function ShelfSection({ title, dishes, empty, href, action }: { title: string; dishes: Dish[]; empty: string; href: string; action: string }) {
  return (
    <section style={{ marginTop: 22 }}>
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK, marginBottom: 10, marginLeft: 2 }}>{title}</div>
      {dishes.length ? (
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {dishes.map((d) => {
            const id = d.source_recipe_id;
            const card = (
              <div style={{ width: 128, flexShrink: 0, overflow: "hidden", borderRadius: 11, border: `2px solid ${INK}`, background: PAPER }}>
                {d.photo_url || d.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.photo_url || d.image_url || ""} alt="" loading="lazy" style={{ width: "100%", height: 84, objectFit: "cover", display: "block" }} />
                ) : <div className="flex items-center justify-center" style={{ height: 84, background: "rgba(255,216,77,0.3)", fontSize: 24 }}>🍳</div>}
                <div style={{ padding: "7px 9px" }}>
                  <div className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK }}>{d.title || "Your cook"}</div>
                  {d.author_name && <div style={{ fontFamily: SANS, fontSize: 10.5, color: "#8A857C", marginTop: 1 }}>from {d.author_name}</div>}
                </div>
              </div>
            );
            return id ? <Link key={d.id} href={`/recipes/${id}`}>{card}</Link> : <div key={d.id}>{card}</div>;
          })}
        </div>
      ) : (
        <div style={{ border: `2px dashed rgba(23,20,16,0.4)`, borderRadius: 12, padding: "14px", background: PAPER }}>
          <p style={{ fontFamily: SANS, fontSize: 13, color: "#4A4742" }}>{empty}</p>
          <Link href={href} style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, marginTop: 6, display: "inline-block" }}>{action}</Link>
        </div>
      )}
    </section>
  );
}
