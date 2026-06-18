"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { UserProfile, Friendship } from "@/types";
import MobileHeader from "@/components/layout/MobileHeader";
import FriendCodeCard from "@/components/friends/FriendCodeCard";
import AddFriendForm from "@/components/friends/AddFriendForm";
import FriendsCookingRow from "@/components/friends/FriendsCookingRow";
import { FriendsIcon } from "@/components/icons/HandDrawnIcons";

type FriendItem = Friendship & { recipe_count?: number };

const INK = "#1C1A17";
const INK_SOFT = "#4A4742";
const TOMATO = "#E5462E";

function handleFor(p: UserProfile | null): string {
  if (!p) return "";
  const base = (p.display_name || "").trim().toLowerCase().replace(/\s+/g, "");
  return base ? `@${base}` : p.friend_code;
}

function initials(name: string): string {
  return (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function FriendsPage() {
  const [tab, setTab] = useState<"my" | "add">("my");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incoming, setIncoming] = useState<Friendship[]>([]);
  const [outgoing, setOutgoing] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [responding, setResponding] = useState<string | null>(null);
  const [showAllFriends, setShowAllFriends] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, friendsRes, pendingRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/friends"),
        fetch("/api/friends/pending"),
      ]);
      const profileData = await profileRes.json();
      const friendsData = await friendsRes.json();
      const pendingData = await pendingRes.json();
      setProfile(profileData.profile || null);
      setFriends(friendsData.friends || []);
      setIncoming(pendingData.incoming || []);
      setOutgoing(pendingData.outgoing || []);
    } catch (error) {
      console.error("Failed to load friends data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function respond(friendshipId: string, action: "accept" | "decline") {
    setResponding(friendshipId);
    try {
      await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: friendshipId, action }),
      });
      await loadAll();
    } catch { /* ignore */ }
    setResponding(null);
  }

  async function cancelRequest(friendshipId: string) {
    setResponding(friendshipId);
    try {
      await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: friendshipId }),
      });
      await loadAll();
    } catch { /* ignore */ }
    setResponding(null);
  }

  function shareCode() {
    if (!profile?.friend_code) return;
    const text = `Add me on Marco — my friend code is ${profile.friend_code}`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator.share({ title: "Marco", text }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(profile.friend_code).catch(() => {});
    }
  }

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const name = f.profile?.display_name?.toLowerCase() ?? "";
      return name.includes(q) || handleFor(f.profile ?? null).toLowerCase().includes(q);
    });
  }, [friends, search]);

  const header = (
    <MobileHeader>
      <div>
        <h1 className="text-3xl marco-h1" style={{ color: INK }}>Friends</h1>
        <p className="text-[13px] mt-0.5" style={{ color: INK_SOFT, opacity: 0.8 }}>
          Cook, save, and share together
        </p>
      </div>
    </MobileHeader>
  );

  if (loading) {
    return (
      <>
        {header}
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          <div className="h-12 skeleton-warm rounded-2xl" />
          <div className="h-28 skeleton-warm rounded-2xl" />
          <div className="h-48 skeleton-warm rounded-2xl" />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div
        className="max-w-2xl mx-auto px-4 pt-3 space-y-6 animate-fade-slide-up"
        style={{ background: "#F5EEE2", paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}
      >
        {/* Tab toggle */}
        <div className="grid grid-cols-2 gap-2.5">
          {(["my", "add"] as const).map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-[14px] transition-colors"
                style={{
                  background: on ? "rgba(229,70,46,0.1)" : "#fff",
                  color: on ? TOMATO : INK,
                  border: on ? `1px solid ${TOMATO}` : "1px solid rgba(28,26,23,0.08)",
                  boxShadow: on ? "none" : "0 1px 6px rgba(20,12,5,0.05)",
                }}
              >
                {t === "my" ? (
                  <>
                    <svg className="w-4.5 h-4.5" width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                    My Friends
                  </>
                ) : (
                  <>
                    <svg className="w-4.5 h-4.5" width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" /></svg>
                    Add Friends
                  </>
                )}
              </button>
            );
          })}
        </div>

        {tab === "my" ? (
          <>
            {/* Search */}
            <div className="flex items-center gap-2 rounded-2xl px-3.5 h-12" style={{ background: "#fff", boxShadow: "0 1px 8px rgba(20,12,5,0.05)" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#a8a29a" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends…"
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: INK }}
              />
            </div>

            {/* Your friends */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold" style={{ color: INK }}>
                  Your friends{friends.length > 0 ? ` (${friends.length})` : ""}
                </h2>
                {filteredFriends.length > 8 && (
                  <button
                    onClick={() => setShowAllFriends((v) => !v)}
                    className="flex items-center gap-0.5 text-[12.5px] font-semibold active:scale-95"
                    style={{ color: INK_SOFT }}
                  >
                    {showAllFriends ? "Show less" : "See all"}
                    <svg className={`w-3.5 h-3.5 transition-transform ${showAllFriends ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              {filteredFriends.length === 0 ? (
                <div className="text-center py-10 rounded-2xl" style={{ background: "#fff", boxShadow: "0 1px 8px rgba(20,12,5,0.05)" }}>
                  <div className="flex justify-center mb-2.5" style={{ color: "#d4c9be" }}><FriendsIcon className="w-10 h-10" /></div>
                  <p className="text-[14px]" style={{ color: INK_SOFT }}>{search ? "No friends match." : "No friends yet"}</p>
                  {!search && (
                    <button onClick={() => setTab("add")} className="mt-2 text-[13px] font-semibold" style={{ color: TOMATO }}>
                      Add a friend →
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2.5">
                  {(showAllFriends ? filteredFriends : filteredFriends.slice(0, 8)).map((f) => {
                    const p = f.profile ?? null;
                    const name = p?.display_name || "Friend";
                    return (
                      <Link
                        key={f.id}
                        href={`/recipes?tab=discover`}
                        className="rounded-2xl px-1.5 py-3 flex flex-col items-center text-center active:scale-[0.97] transition-transform"
                        style={{ background: "#fff", boxShadow: "0 1px 8px rgba(20,12,5,0.06)" }}
                      >
                        <div className="relative mb-1.5">
                          <span
                            className="flex items-center justify-center rounded-full overflow-hidden"
                            style={{ width: 46, height: 46, background: "linear-gradient(135deg,#E8A33D,#E5462E)", color: "#fff", fontWeight: 700, fontSize: 14 }}
                          >
                            {p?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.avatar_url} alt={name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              initials(name)
                            )}
                          </span>
                          <span className="absolute bottom-0 right-0 rounded-full" style={{ width: 11, height: 11, background: "#22c55e", border: "2px solid #fff" }} />
                        </div>
                        <p className="font-bold text-[11.5px] leading-tight truncate w-full" style={{ color: INK }}>{name}</p>
                        <p className="text-[9.5px] mt-0.5" style={{ color: INK_SOFT, opacity: 0.6 }}>
                          {f.recipe_count ?? 0} saved
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* What your friends are cooking — same cards as Discover */}
            <FriendsCookingRow />

            {/* Pending invitations — incoming (accept/ignore) + outgoing (cancel) */}
            {(incoming.length + outgoing.length) > 0 && (
              <section>
                <h2 className="text-base font-bold mb-3" style={{ color: INK }}>
                  Pending invitations ({incoming.length + outgoing.length})
                </h2>
                <div className="space-y-2">
                  {incoming.map((req) => {
                    const p = req.profile ?? null;
                    const name = p?.display_name || "Someone";
                    return (
                      <div key={req.id} className="flex items-center gap-3 rounded-2xl px-3 py-3" style={{ background: "#fff", boxShadow: "0 1px 8px rgba(20,12,5,0.05)" }}>
                        <span className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden" style={{ width: 40, height: 40, background: "rgba(229,70,46,0.12)", color: TOMATO, fontWeight: 700, fontSize: 13 }}>
                          {p?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatar_url} alt={name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : initials(name)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[14px] truncate" style={{ color: INK }}>{name}</p>
                          <p className="text-[12px] truncate" style={{ color: INK_SOFT, opacity: 0.7 }}>{handleFor(p)}</p>
                        </div>
                        <button
                          onClick={() => respond(req.id, "decline")}
                          disabled={responding === req.id}
                          className="px-3.5 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-50"
                          style={{ background: "#fff", color: INK, border: "1px solid rgba(28,26,23,0.14)" }}
                        >
                          Ignore
                        </button>
                        <button
                          onClick={() => respond(req.id, "accept")}
                          disabled={responding === req.id}
                          className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50"
                          style={{ background: TOMATO }}
                        >
                          Accept
                        </button>
                      </div>
                    );
                  })}
                  {outgoing.map((req) => {
                    const p = req.profile ?? null;
                    const name = p?.display_name || "Someone";
                    return (
                      <div key={req.id} className="flex items-center gap-3 rounded-2xl px-3 py-3" style={{ background: "#fff", boxShadow: "0 1px 8px rgba(20,12,5,0.05)" }}>
                        <span className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden" style={{ width: 40, height: 40, background: "rgba(229,70,46,0.12)", color: TOMATO, fontWeight: 700, fontSize: 13 }}>
                          {p?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatar_url} alt={name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : initials(name)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[14px] truncate" style={{ color: INK }}>{name}</p>
                          <p className="text-[12px] truncate" style={{ color: INK_SOFT, opacity: 0.7 }}>Request sent · pending</p>
                        </div>
                        <button
                          onClick={() => cancelRequest(req.id)}
                          disabled={responding === req.id}
                          className="px-3.5 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-50"
                          style={{ background: "#fff", color: INK_SOFT, border: "1px solid rgba(28,26,23,0.14)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Invite banner */}
            <div className="flex items-center gap-3 rounded-2xl px-4 py-4" style={{ background: "rgba(229,70,46,0.08)", border: "1px solid rgba(229,70,46,0.18)" }}>
              <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: "rgba(229,70,46,0.14)", color: TOMATO }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" /></svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px]" style={{ color: TOMATO }}>Invite friends to Marco</p>
                <p className="text-[12.5px]" style={{ color: INK_SOFT, opacity: 0.85 }}>Share your code so friends can find and add you.</p>
              </div>
              <button onClick={shareCode} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white flex-shrink-0 active:scale-95 transition-transform" style={{ background: TOMATO }}>
                Share Code
              </button>
            </div>
          </>
        ) : (
          /* ── Add Friends tab ─────────────────────────────────────── */
          <>
            {profile && (
              <FriendCodeCard friendCode={profile.friend_code} displayName={profile.display_name} />
            )}

            <div className="rounded-2xl p-5" style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <h2 className="text-base font-bold mb-3" style={{ color: INK }}>Add a Friend</h2>
              <AddFriendForm onRequestSent={loadAll} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
