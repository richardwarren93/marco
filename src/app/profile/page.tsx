"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import type { UserProfile, CookingGoal } from "@/types";
import { useRecipes, useCollections, useProfile, apiFetcher } from "@/lib/hooks/use-data";
import { RecipesIcon, CollectionsIcon, FriendsIcon } from "@/components/icons/HandDrawnIcons";
import BadgesCard from "@/components/gamification/BadgesCard";
import HouseholdCard from "@/components/household/HouseholdCard";

export default function ProfilePage() {
  const { data: profileData, isLoading: profileLoading, mutate: mutateProfile } = useProfile();
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: collectionsData, isLoading: collectionsLoading } = useCollections();
  const { data: friendsData, isLoading: friendsLoading } = useSWR("/api/friends", apiFetcher, { revalidateOnFocus: false });
  const { data: goalData, isLoading: goalLoading, mutate: mutateGoal } = useSWR("/api/cooking-goal", apiFetcher, { revalidateOnFocus: false });

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
  const [copied, setCopied] = useState(false);
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

  async function handleCopyCode() {
    if (profile) {
      await navigator.clipboard.writeText(profile.friend_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto" style={{ background: "#faf9f7", minHeight: "100vh" }}>
        <div className="h-36 rounded-b-[2rem] skeleton-warm" />
        <div className="px-5 -mt-10 space-y-4">
          <div className="w-20 h-20 rounded-full skeleton-warm mx-auto ring-4 ring-[#faf9f7]" />
          <div className="h-5 skeleton-warm rounded-2xl w-32 mx-auto" />
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 skeleton-warm rounded-2xl" />
            ))}
          </div>
          <div className="h-56 skeleton-warm rounded-2xl" />
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

  return (
    <div className="max-w-lg mx-auto pb-8" style={{ background: "#faf9f7", minHeight: "100vh" }}>

      {/* ── Banner + Avatar ── */}
      <div className="relative">
        <div
          className="h-36 rounded-b-[2rem] bg-cover bg-center"
          style={{ backgroundImage: "url('https://cdn.midjourney.com/c298197d-b07e-440a-9524-f90b7577ceb1/0_0.png')" }}
        />

        <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 z-10">
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative w-20 h-20 rounded-full ring-4 ring-[#faf9f7] shadow-xl group"
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

      {/* ── Name ── */}
      <div className="text-center pt-12 px-6 pb-1">
        {editing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full max-w-[220px] px-3 py-2 border border-gray-300 rounded-xl text-center text-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none mx-auto block"
              autoFocus
            />
            <div className="flex items-center justify-center gap-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium">
                {saving ? "..." : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setDisplayName(profile?.display_name || ""); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "#1a1410" }}>{profile?.display_name}</h1>
            <button
              onClick={() => setEditing(true)}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-orange-50 flex items-center justify-center transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Stats — 2x2 grid ── */}
      <div className="grid grid-cols-2 gap-2.5 px-5 py-3">
        <Link
          href="/recipes"
          className="flex items-center justify-center gap-1.5 bg-orange-50 py-2.5 rounded-2xl ring-1 ring-orange-200/50 hover:shadow-md transition-all active:scale-95"
        >
          <RecipesIcon className="w-4 h-4 text-orange-600" />
          <span className="text-lg font-black text-orange-600">{stats.recipes}</span>
          <span className="text-[11px] text-gray-500 font-medium">Recipes</span>
        </Link>

        <Link
          href="/recipes?tab=collections"
          className="flex items-center justify-center gap-1.5 bg-violet-50 py-2.5 rounded-2xl ring-1 ring-violet-200/50 hover:shadow-md transition-all active:scale-95"
        >
          <CollectionsIcon className="w-4 h-4 text-violet-600" />
          <span className="text-lg font-black text-violet-600">{stats.collections}</span>
          <span className="text-[11px] text-gray-500 font-medium">Collections</span>
        </Link>

        <Link
          href="/friends"
          className="flex items-center justify-center gap-1.5 bg-emerald-50 py-2.5 rounded-2xl ring-1 ring-emerald-200/50 hover:shadow-md transition-all active:scale-95"
        >
          <FriendsIcon className="w-4 h-4 text-emerald-600" />
          <span className="text-lg font-black text-emerald-600">{stats.friends}</span>
          <span className="text-[11px] text-gray-500 font-medium">Friends</span>
        </Link>

        {/* Weekly Goal chip */}
        <div className="relative">
          <button
            onClick={() => setShowGoalPicker(!showGoalPicker)}
            className="w-full flex items-center justify-center gap-1.5 bg-amber-50 py-2.5 rounded-2xl ring-1 ring-amber-200/50 hover:shadow-md transition-all active:scale-95"
          >
            <span className="text-sm">🔥</span>
            <span className="text-lg font-black text-amber-600">{goalTarget || "–"}</span>
            <span className="text-[11px] text-gray-500 font-medium">/ week</span>
          </button>

          {/* Goal picker dropdown */}
          {showGoalPicker && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowGoalPicker(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white rounded-2xl shadow-xl ring-1 ring-gray-200/60 p-2.5 animate-pop-in">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider text-center mb-2">Meals per week</p>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleGoalSelect(n)}
                      disabled={savingGoal}
                      className={`w-full aspect-square rounded-xl text-sm font-bold transition-all active:scale-90 ${
                        n === goalTarget
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-gray-50 text-gray-600 hover:bg-amber-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Badges — Showcase ── */}
      <div className="px-4 pt-1">
        <BadgesCard />
      </div>

      {/* ── Household ── */}
      <div className="px-4 pt-4">
        <HouseholdCard />
      </div>

      {/* ── Friend Code ── */}
      {profile && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #fff8f0 0%, #fef3e2 100%)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-0.5">Friend Code</p>
              <p className="text-lg font-black text-orange-600 tracking-widest">{profile.friend_code}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopyCode} className="px-3.5 py-2 bg-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all active:scale-95">
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={async () => {
                  if (navigator.share) {
                    await navigator.share({ title: "Add me on Marco!", text: `Add me on Marco! My code is ${profile.friend_code}`, url: `${window.location.origin}/add/${profile.friend_code}` }).catch(() => {});
                  }
                }}
                className="px-3.5 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-orange-700 transition-colors active:scale-95"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
