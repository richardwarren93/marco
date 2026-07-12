"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, CookingGoal } from "@/types";
import { useRecipes, useCollections, useProfile, apiFetcher } from "@/lib/hooks/use-data";
import type { TomatoHealthState } from "@/lib/gamification";
import MobileHeader from "@/components/layout/MobileHeader";
import WeeklyReviewCard from "@/components/gamification/WeeklyReviewCard";
import { TastePreviewCard, BadgesPreviewCard } from "@/components/profile/PreviewCards";

/* Profile hub — identity + living stats up top, features as visual tiles
   (Taste DNA, Badges, Tomatoes, Household), the weekly recap, and the one-time
   settings collapsed into a menu (Food preferences, Text Marco, Notifications,
   Account). Every tile previews live state; the deep content lives on
   /profile/{taste,badges,preferences,household,text,notifications,account}. */

interface TasteTile {
  all?: { sweet: number; savory: number; richness: number; tangy: number; spicy: number };
  cuisines?: { id: string; label: string; flag: string }[];
}
interface BadgesTile {
  earned?: number;
  total?: number;
  progress?: { earned: boolean; badge?: { icon?: string } }[];
}
interface TomatoTile { balance?: number; mascot?: { state: TomatoHealthState; streak: number } }
interface HouseholdTile {
  household?: { name: string; members?: { display_name: string }[] } | null;
}

const TILE_STYLE = {
  background: "#FFFDF7",
  border: "1px solid rgba(28,26,23,0.08)",
  boxShadow: "0 1px 3px rgba(28,26,23,0.05)",
} as const;

function Chevron() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#b4ab9e" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function ProfilePage() {
  const { data: profileData, isLoading: profileLoading, mutate: mutateProfile } = useProfile();
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: collectionsData, isLoading: collectionsLoading } = useCollections();
  const { data: friendsData, isLoading: friendsLoading } = useSWR("/api/friends", apiFetcher, { revalidateOnFocus: false });
  const { data: goalData, isLoading: goalLoading, mutate: mutateGoal } = useSWR("/api/cooking-goal", apiFetcher, { revalidateOnFocus: false });

  // Tile previews — never gate the page on these; each tile has its own idle state.
  const { data: taste } = useSWR<TasteTile>("/api/taste-profile", apiFetcher, { revalidateOnFocus: false });
  const { data: badges } = useSWR<BadgesTile>("/api/badges", apiFetcher, { revalidateOnFocus: false });
  const { data: tomatoes } = useSWR<TomatoTile>("/api/tomatoes", apiFetcher, { revalidateOnFocus: false });
  const { data: householdData } = useSWR<HouseholdTile>("/api/household", apiFetcher, { revalidateOnFocus: false });

  // Guest detection — the hub only shows a slim banner; the upgrade flow lives
  // on /profile/account.
  const [isGuest, setIsGuest] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((result: { data: { user: { is_anonymous?: boolean } | null } }) => {
      setIsGuest(result.data.user?.is_anonymous === true);
    });
  }, []);

  const profile: UserProfile | null = profileData?.profile ?? null;
  const goal: CookingGoal | null = goalData?.goal ?? null;
  const loading = profileLoading || recipesLoading || collectionsLoading || friendsLoading || goalLoading;

  const stats = {
    recipes: recipes.length,
    collections: (collectionsData?.collections ?? []).length,
    friends: (friendsData?.friends ?? []).length,
  };

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const goalTarget = goal?.weekly_target ?? 0;

  useEffect(() => {
    if (profile?.display_name && !editing) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name, editing]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    });
    if (res.ok) {
      await mutateProfile();
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleGoalSelect(value: number) {
    setSavingGoal(true);
    try {
      const res = await fetch("/api/cooking-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_target: value }),
      });
      if (res.ok) await mutateGoal();
    } catch { /* ignore */ }
    setSavingGoal(false);
    setShowGoalPicker(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload-image", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: uploadData.url }),
      });
      if (profileRes.ok) await mutateProfile();
    } catch {
      // upload failed silently
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto" style={{ background: "#F5EEE2", minHeight: "100vh" }}>
        <div className="h-36 rounded-b-[2rem] skeleton-warm" />
        <div className="px-5 -mt-10 space-y-4">
          <div className="w-20 h-20 rounded-full skeleton-warm mx-auto ring-4 ring-[#F5EEE2]" />
          <div className="h-5 skeleton-warm rounded-2xl w-32 mx-auto" />
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 skeleton-warm rounded-2xl" />
            ))}
          </div>
          <div className="h-40 skeleton-warm rounded-2xl" />
        </div>
      </div>
    );
  }

  const initials = (profile?.display_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ── Card preview values ──
  const tasteScores = taste?.all ?? null;
  const earnedIcons = (badges?.progress ?? [])
    .filter((p) => p.earned)
    .slice(0, 6)
    .map((p) => p.badge?.icon || "🏅");

  const streak = tomatoes?.mascot?.streak ?? 0;
  const household = householdData?.household ?? null;
  const verifiedPhone = Boolean(profile?.phone_verified_at && profile?.phone);


  return (
    <div className="max-w-lg mx-auto pb-8" style={{ background: "#F5EEE2", minHeight: "100vh" }}>
      <MobileHeader title="Profile" />

      {/* ── Guest banner — slim; the upgrade flow lives on the Account page ── */}
      {isGuest && (
        <Link
          href="/profile/account"
          className="mx-4 mt-3 p-3.5 rounded-2xl flex items-center gap-3 active:scale-[0.99] transition-transform"
          style={{ background: "#fff4ec", border: "1px solid #fcd9bd" }}
        >
          <span className="text-xl flex-shrink-0">🔒</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold" style={{ color: "#1C1A17" }}>Secure your account</p>
            <p className="text-[11.5px]" style={{ color: "#a09890" }}>Add an email so you never lose your recipes</p>
          </div>
          <Chevron />
        </Link>
      )}

      {/* ── Banner + Avatar ── */}
      <div className="relative">
        <div
          className="h-40 sm:h-48 bg-cover bg-center"
          style={{ backgroundImage: "url('/default-banner.webp')" }}
        />

        <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 z-10">
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative w-20 h-20 rounded-full ring-4 ring-[#F5EEE2] shadow-xl group"
          >
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.display_name} width={80} height={80} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-2xl">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              {uploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">📷</span>
              )}
            </div>
          </button>
        </div>
      </div>

      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" />

      {/* ── Name + streak chip ── */}
      <div className="text-center pt-14 px-6 pb-1">
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full max-w-[260px] px-3 py-2.5 border border-gray-200 rounded-xl text-center text-xl font-black tracking-tight focus:ring-2 focus:ring-orange-300 focus:border-transparent outline-none mx-auto block bg-white"
              autoFocus
            />
            <div className="flex items-center justify-center gap-2">
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-full text-sm font-bold text-white active:scale-95 transition-all" style={{ background: "#e8530a" }}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setDisplayName(profile?.display_name || ""); }} className="px-5 py-2 rounded-full text-sm font-semibold text-gray-600 active:scale-95 transition-all" style={{ background: "#eeecea" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 active:scale-[0.98] transition-transform"
          >
            <h1 className="text-[22px] font-black tracking-tight" style={{ color: "#1C1A17", letterSpacing: "-0.02em" }}>
              {profile?.display_name}
            </h1>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#c0b8af" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
        )}

        {!editing && tomatoes && (
          <div className="pt-2">
            <Link
              href="/tomatoes"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
              style={{ background: "rgba(229,70,46,0.1)", color: "#B8331E" }}
            >
              {streak > 0 ? <>🔥 {streak}-day streak</> : <>🍅 {tomatoes.balance ?? 0}</>}
              {streak > 0 && <span style={{ opacity: 0.7 }}>· 🍅 {tomatoes.balance ?? 0}</span>}
            </Link>
          </div>
        )}
      </div>

      {/* ── Stats — single card, horizontal divisions ── */}
      <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
        <div className="grid grid-cols-4">
          <Link
            href="/recipes"
            className="flex flex-col items-center gap-1 py-4 border-r border-gray-100 active:bg-gray-50 transition-colors"
          >
            <span className="text-3xl marco-h1" style={{ color: "#1C1A17" }}>{stats.recipes}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#a09890" }}>Recipes</span>
          </Link>

          <Link
            href="/collections"
            className="flex flex-col items-center gap-1 py-4 border-r border-gray-100 active:bg-gray-50 transition-colors"
          >
            <span className="text-3xl marco-h1" style={{ color: "#1C1A17" }}>{stats.collections}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#a09890" }}>Collections</span>
          </Link>

          <Link
            href="/friends"
            className="flex flex-col items-center gap-1 py-4 border-r border-gray-100 active:bg-gray-50 transition-colors"
          >
            <span className="text-3xl marco-h1" style={{ color: "#1C1A17" }}>{stats.friends}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#a09890" }}>Friends</span>
          </Link>

          <button
            onClick={() => setShowGoalPicker(!showGoalPicker)}
            className="relative flex flex-col items-center gap-1 py-4 active:bg-gray-50 transition-colors"
          >
            <span className="text-3xl marco-h1" style={{ color: "#1C1A17" }}>{goalTarget || "–"}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#a09890" }}>Per Week</span>
          </button>
        </div>

        {/* Goal picker dropdown */}
        {showGoalPicker && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowGoalPicker(false)} />
            <div className="relative z-30 border-t border-gray-100 p-3 animate-pop-in">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider text-center mb-2">Meals per week goal</p>
              <div className="grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleGoalSelect(n)}
                    disabled={savingGoal}
                    className={`w-full aspect-square rounded-xl text-sm font-bold transition-all active:scale-90 ${
                      n === goalTarget
                        ? "text-white shadow-sm"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                    style={n === goalTarget ? { background: "#e8530a" } : undefined}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Feature cards — each background previews what's inside ── */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        <TastePreviewCard scores={tasteScores} />
        <BadgesPreviewCard earned={badges?.earned} total={badges?.total} icons={earnedIcons} />
      </div>

      {/* ── Last week's cooking recap ── */}
      <WeeklyReviewCard />

      {/* ── Settings menu ── */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={TILE_STYLE}>
        {[
          { href: "/profile/household", icon: "🏠", label: "Household", hint: household?.name as string | undefined },
          { href: "/profile/preferences", icon: "🥗", label: "Food preferences", hint: undefined as string | undefined },
          { href: "/profile/text", icon: "💬", label: "Text Marco", hint: verifiedPhone ? "Linked" : undefined },
          { href: "/profile/notifications", icon: "🔔", label: "Notifications", hint: undefined },
          { href: "/profile/account", icon: "👤", label: "Account", hint: isGuest ? "Guest — add an email" : undefined },
        ].map((row, i, arr) => (
          <Link
            key={row.href}
            href={row.href}
            className="flex items-center gap-3 px-4 py-3.5 active:bg-black/[0.03] transition-colors"
            style={i < arr.length - 1 ? { borderBottom: "1px solid rgba(28,26,23,0.06)" } : undefined}
          >
            <span className="text-[16px] flex-shrink-0" aria-hidden>{row.icon}</span>
            <span className="text-[13.5px] font-medium flex-1" style={{ color: "#1C1A17" }}>{row.label}</span>
            {row.hint && <span className="text-[11px] flex-shrink-0" style={{ color: "#8a8378" }}>{row.hint}</span>}
            <Chevron />
          </Link>
        ))}
      </div>
    </div>
  );
}
