"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, CookingGoal } from "@/types";
import { useRecipes, useCollections, useProfile, apiFetcher } from "@/lib/hooks/use-data";
import { RecipesIcon, CollectionsIcon, FriendsIcon } from "@/components/icons/HandDrawnIcons";
import MobileHeader from "@/components/layout/MobileHeader";
import BadgesCard from "@/components/gamification/BadgesCard";
import TasteProfileCard from "@/components/gamification/TasteProfileCard";
import HouseholdCard from "@/components/household/HouseholdCard";

export default function ProfilePage() {
  const { data: profileData, isLoading: profileLoading, mutate: mutateProfile } = useProfile();
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: collectionsData, isLoading: collectionsLoading } = useCollections();
  const { data: friendsData, isLoading: friendsLoading } = useSWR("/api/friends", apiFetcher, { revalidateOnFocus: false });
  const { data: goalData, isLoading: goalLoading, mutate: mutateGoal } = useSWR("/api/cooking-goal", apiFetcher, { revalidateOnFocus: false });

  // Detect anonymous (guest) users
  const [isGuest, setIsGuest] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState("");
  const [upgradePassword, setUpgradePassword] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeSent, setUpgradeSent] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((result: { data: { user: { is_anonymous?: boolean } | null } }) => {
      setIsGuest(result.data.user?.is_anonymous === true);
    });
  }, []);

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setUpgradeError("");
    setUpgradeLoading(true);
    const supabase = createClient();
    const { error: pwError } = await supabase.auth.updateUser({ password: upgradePassword });
    if (pwError) {
      setUpgradeError(pwError.message);
      setUpgradeLoading(false);
      return;
    }
    const { error: emailError } = await supabase.auth.updateUser({ email: upgradeEmail });
    if (emailError) {
      setUpgradeError(emailError.message);
      setUpgradeLoading(false);
      return;
    }
    setUpgradeSent(true);
    setUpgradeLoading(false);
  }

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

      {/* ── Guest upgrade banner ── */}
      {isGuest && !showUpgrade && (
        <div className="mx-4 mt-3 p-4 rounded-2xl flex items-start gap-3" style={{ background: "#fff4ec", border: "1px solid #fcd9bd" }}>
          <span className="text-2xl flex-shrink-0">🔒</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "#1a1410" }}>Secure your account</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#a09890" }}>
              Add an email to access Marco from any device and never lose your recipes.
            </p>
            <button
              onClick={() => setShowUpgrade(true)}
              className="mt-2.5 px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all active:scale-95"
              style={{ background: "#e8530a" }}
            >
              Add email
            </button>
          </div>
        </div>
      )}

      {/* ── Upgrade form ── */}
      {isGuest && showUpgrade && !upgradeSent && (
        <div className="mx-4 mt-3 p-4 rounded-2xl" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: "#1a1410" }}>Secure your account</p>
            <button onClick={() => setShowUpgrade(false)} className="text-gray-400 text-sm" aria-label="Close">✕</button>
          </div>
          <form onSubmit={handleUpgrade} className="space-y-2.5">
            {upgradeError && (
              <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-xs">{upgradeError}</div>
            )}
            <input
              type="email"
              value={upgradeEmail}
              onChange={(e) => setUpgradeEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 bg-gray-50 focus:bg-white transition-all"
            />
            <input
              type="password"
              value={upgradePassword}
              onChange={(e) => setUpgradePassword(e.target.value)}
              required
              minLength={6}
              placeholder="Choose a password (6+ chars)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 bg-gray-50 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={upgradeLoading}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "#e8530a" }}
            >
              {upgradeLoading ? "Securing..." : "Secure account"}
            </button>
          </form>
        </div>
      )}

      {isGuest && upgradeSent && (
        <div className="mx-4 mt-3 p-4 rounded-2xl" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
          <p className="text-sm font-bold" style={{ color: "#065f46" }}>📬 Check your email!</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "#065f46" }}>
            We sent a confirmation link to <strong>{upgradeEmail}</strong>. Click it to finish securing your account.
          </p>
        </div>
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
            <h1 className="text-[22px] font-black tracking-tight" style={{ color: "#1a1410", letterSpacing: "-0.02em" }}>
              {profile?.display_name}
            </h1>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#c0b8af" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Stats — single card, horizontal divisions ── */}
      <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
        <div className="grid grid-cols-4">
          <Link
            href="/recipes"
            className="flex flex-col items-center gap-1 py-4 border-r border-gray-100 active:bg-gray-50 transition-colors"
          >
            <span className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>{stats.recipes}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#a09890" }}>Recipes</span>
          </Link>

          <Link
            href="/collections"
            className="flex flex-col items-center gap-1 py-4 border-r border-gray-100 active:bg-gray-50 transition-colors"
          >
            <span className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>{stats.collections}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#a09890" }}>Collections</span>
          </Link>

          <Link
            href="/friends"
            className="flex flex-col items-center gap-1 py-4 border-r border-gray-100 active:bg-gray-50 transition-colors"
          >
            <span className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>{stats.friends}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#a09890" }}>Friends</span>
          </Link>

          <button
            onClick={() => setShowGoalPicker(!showGoalPicker)}
            className="relative flex flex-col items-center gap-1 py-4 active:bg-gray-50 transition-colors"
          >
            <span className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>{goalTarget || "–"}</span>
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

      {/* ── Taste Profile ── */}
      <div className="px-4 pt-1">
        <TasteProfileCard />
      </div>

      {/* ── Badges — Showcase ── */}
      <div className="px-4 pt-4">
        <BadgesCard />
      </div>

      {/* ── Household ── */}
      <div className="px-4 pt-4">
        <HouseholdCard />
      </div>

      {/* ── Log out ── */}
      <div className="px-4 pt-8 pb-12">
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            document.cookie = "marco_onboarded=; path=/; max-age=0";
            window.location.href = "/auth/signup";
          }}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-red-500 transition-colors active:scale-[0.98]"
          style={{ background: "rgba(239,68,68,0.06)" }}
        >
          Log out
        </button>
      </div>

    </div>
  );
}
