"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { UserProfile, CookingGoal } from "@/types";
import { RecipesIcon, CollectionsIcon, FriendsIcon, TomatoIcon } from "@/components/icons/HandDrawnIcons";
import GoalSetting from "@/components/gamification/GoalSetting";
import BadgesCard from "@/components/gamification/BadgesCard";
import HouseholdCard from "@/components/household/HouseholdCard";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ recipes: 0, collections: 0, friends: 0, tomatoes: 0 });
  const [goal, setGoal] = useState<CookingGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [profileRes, recipesRes, collectionsRes, friendsRes, goalRes] = await Promise.all([
        fetch("/api/profile"),
        supabase.from("recipes").select("id", { count: "exact", head: true }),
        fetch("/api/collections"),
        fetch("/api/friends"),
        fetch("/api/cooking-goal"),
      ]);

      const profileData = await profileRes.json();
      const collectionsData = await collectionsRes.json();
      const friendsData = await friendsRes.json();
      const goalData = await goalRes.json();

      setProfile(profileData.profile || null);
      setDisplayName(profileData.profile?.display_name || "");
      setGoal(goalData.goal || null);
      setStats({
        recipes: recipesRes.count || 0,
        collections: (collectionsData.collections || []).length,
        friends: (friendsData.friends || []).length,
        tomatoes: profileData.profile?.tomato_balance || 0,
      });
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
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
      const profileData = await profileRes.json();
      if (profileRes.ok) setProfile(profileData.profile);
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
      <div className="max-w-lg mx-auto px-4 py-8" style={{ background: "#faf9f7", minHeight: "100vh" }}>
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-full skeleton-warm mx-auto" />
          <div className="h-5 skeleton-warm rounded-2xl w-32 mx-auto" />
          <div className="h-24 skeleton-warm rounded-3xl" />
          <div className="h-32 skeleton-warm rounded-3xl" />
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
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6" style={{ background: "#faf9f7", minHeight: "100vh" }}>
      {/* Avatar & Name */}
      <div className="text-center">
        <button
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative w-20 h-20 rounded-full mx-auto shadow-lg group"
        >
          {profile?.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-2xl">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            {uploadingAvatar ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg">📷</span>
            )}
          </div>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
        {editing ? (
          <div className="mt-3 flex items-center justify-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-center text-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-sm font-medium"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={() => { setEditing(false); setDisplayName(profile?.display_name || ""); }}
              className="px-3 py-1.5 bg-gray-200 rounded-xl text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: "#1a1410" }}>{profile?.display_name}</h1>
              <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full">
                <TomatoIcon className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-600">{stats.tomatoes}</span>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-[#a09890] hover:text-orange-600 mt-1"
            >
              Edit name
            </button>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Recipes", value: stats.recipes, Icon: RecipesIcon, href: "/recipes" },
          { label: "Collections", value: stats.collections, Icon: CollectionsIcon, href: "/recipes?tab=collections" },
          { label: "Friends", value: stats.friends, Icon: FriendsIcon, href: "/friends" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-white rounded-3xl p-3 text-center transition-shadow" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            <div className="text-orange-500 flex justify-center"><stat.Icon className="w-5 h-5" /></div>
            <p className="text-2xl font-black mt-1" style={{ color: "#1a1410" }}>{stat.value}</p>
            <p className="text-xs" style={{ color: "#a09890" }}>{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Badges — Pokédex */}
      <BadgesCard />

      {/* Cooking Goal */}
      <GoalSetting
        currentTarget={goal?.weekly_target ?? null}
        onSaved={(target) => setGoal(goal ? { ...goal, weekly_target: target } : null)}
      />

      {/* Household */}
      <HouseholdCard />

      {/* Friend Code */}
      {profile && (
        <div className="rounded-3xl p-5 text-center" style={{ background: "linear-gradient(135deg, #fff8f0 0%, #fef3e2 100%)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <p className="text-xs text-gray-500 mb-1">Your Friend Code</p>
          <p className="text-2xl font-bold text-orange-600 tracking-widest mb-3">
            {profile.friend_code}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-white rounded-full text-sm font-medium shadow-sm hover:shadow transition-all"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({
                    title: "Add me on Marco!",
                    text: `Add me on Marco! My code is ${profile.friend_code}`,
                    url: `${window.location.origin}/add/${profile.friend_code}`,
                  }).catch(() => {});
                }
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-full text-sm font-medium shadow-sm hover:bg-orange-700 transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="space-y-2">
        <Link
          href="/friends"
          className="flex items-center justify-between bg-white rounded-3xl p-4 transition-all" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <FriendsIcon className="w-5 h-5 text-orange-500" />
            <span className="font-medium text-gray-900">My Friends</span>
          </div>
          <span className="text-gray-400 text-sm">{stats.friends} friends →</span>
        </Link>
        <Link
          href="/recipes"
          className="flex items-center justify-between bg-white rounded-3xl p-4 transition-all" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <RecipesIcon className="w-5 h-5 text-orange-500" />
            <span className="font-medium text-gray-900">The Kitchen</span>
          </div>
          <span className="text-gray-400 text-sm">→</span>
        </Link>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 text-red-400 text-sm font-medium hover:bg-red-50 rounded-3xl transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
