"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { UserProfile, Friendship } from "@/types";
import PageHeader from "@/components/layout/PageHeader";
import FriendCodeCard from "@/components/friends/FriendCodeCard";
import AddFriendForm from "@/components/friends/AddFriendForm";
import FriendsCookingRow from "@/components/friends/FriendsCookingRow";
import { FriendsIcon } from "@/components/icons/HandDrawnIcons";
import KitchenSurface from "@/components/layout/KitchenSurface";
import { BUTTER, DISPLAY, INK, INK_MUTED, INK_SOFT, LIME, PAPER, TOMATO } from "@/lib/theme";

type FriendItem = Friendship & { recipe_count?: number };


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
    <PageHeader title="Friends" subtitle="cook, save, and share together" bell balance avatar />
  );

  if (loading) {
    return (
      <KitchenSurface>
        {header}
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          <div className="h-12 skeleton-warm" style={{ borderRadius: 16, border: `2.5px solid ${INK}` }} />
          <div className="h-28 skeleton-warm" style={{ borderRadius: 16, border: `2.5px solid ${INK}` }} />
          <div className="h-48 skeleton-warm" style={{ borderRadius: 16, border: `2.5px solid ${INK}` }} />
        </div>
      </KitchenSurface>
    );
  }

  return (
    <KitchenSurface>
      {header}
      <div className="max-w-2xl mx-auto px-4 pt-3 space-y-6 animate-fade-slide-up">
        {/* Tab toggle */}
        <div className="grid grid-cols-2 gap-2.5">
          {(["my", "add"] as const).map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex items-center justify-center gap-2 py-3 text-[14px] transition-transform"
                style={{
                  background: on ? BUTTER : PAPER,
                  color: INK,
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  border: `2.5px solid ${INK}`,
                  borderRadius: 12,
                  boxShadow: on ? `1px 2px 0 ${INK}` : `3px 4px 0 ${INK}`,
                  transform: on ? "translate(2px, 2px)" : undefined,
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
            <div className="flex items-center gap-2 px-3.5 h-12" style={{ background: PAPER, borderRadius: 14, border: `2.5px solid ${INK}`, boxShadow: `3px 4px 0 ${INK}` }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={INK_MUTED} strokeWidth={2}>
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
                <h2 style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>
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
                <div className="text-center py-10" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
                  <div className="flex justify-center mb-2.5" style={{ color: INK_MUTED }}><FriendsIcon className="w-10 h-10" /></div>
                  <p className="text-[14px]" style={{ color: INK_SOFT }}>{search ? "No friends match." : "No friends yet"}</p>
                  {!search && (
                    <button onClick={() => setTab("add")} className="mt-3 px-4 py-2 active:scale-95 transition-transform" style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, border: `2.5px solid ${INK}`, borderRadius: 99, boxShadow: `3px 3px 0 ${INK}` }}>
                      Add a friend
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
                        href={p?.user_id ? `/friends/${p.user_id}` : "/discover"}
                        className="px-1.5 py-3 flex flex-col items-center text-center active:scale-[0.97] transition-transform"
                        style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}
                      >
                        <div className="relative mb-1.5">
                          <span
                            className="flex items-center justify-center rounded-full overflow-hidden"
                            style={{ width: 46, height: 46, background: INK, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, border: `2px solid ${INK}` }}
                          >
                            {p?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.avatar_url} alt={name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              initials(name)
                            )}
                          </span>
                          <span className="absolute bottom-0 right-0 rounded-full" style={{ width: 12, height: 12, background: LIME, border: `2px solid ${INK}` }} />
                        </div>
                        <p className="text-[11.5px] line-clamp-2 w-full" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, lineHeight: 1.1 }}>{name}</p>
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
                <h2 className="mb-3" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>
                  Pending invitations ({incoming.length + outgoing.length})
                </h2>
                <div className="space-y-2">
                  {incoming.map((req) => {
                    const p = req.profile ?? null;
                    const name = p?.display_name || "Someone";
                    return (
                      <div key={req.id} className="flex items-center gap-3 px-3 py-3" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
                        <span className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden" style={{ width: 40, height: 40, background: INK, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14 }}>
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
                          className="px-3.5 py-2 text-[13px] active:scale-95 transition-transform disabled:opacity-50"
                          style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 10, boxShadow: `2px 2px 0 ${INK}` }}
                        >
                          Ignore
                        </button>
                        <button
                          onClick={() => respond(req.id, "accept")}
                          disabled={responding === req.id}
                          className="px-4 py-2 text-[13px] active:scale-95 transition-transform disabled:opacity-50"
                          style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 10, boxShadow: `2px 2px 0 ${INK}` }}
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
                      <div key={req.id} className="flex items-center gap-3 px-3 py-3" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
                        <span className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden" style={{ width: 40, height: 40, background: INK, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14 }}>
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
                          className="px-3.5 py-2 text-[13px] active:scale-95 transition-transform disabled:opacity-50"
                          style={{ background: PAPER, color: INK_SOFT, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 10, boxShadow: `2px 2px 0 ${INK}` }}
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
            <div className="px-4 py-4" style={{ background: BUTTER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
              <div className="flex items-center gap-3">
              <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: PAPER, color: INK, border: `2px solid ${INK}` }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" /></svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px]" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700 }}>Invite friends to Marco</p>
                <p className="text-[12.5px]" style={{ color: INK, opacity: 0.7 }}>Share your code so friends can find and add you.</p>
                </div>
              </div>
              <button onClick={shareCode} className="w-full mt-3 py-2.5 text-[13.5px] active:scale-[0.98] transition-transform" style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 10, boxShadow: `3px 3px 0 ${INK}` }}>
                Share code
              </button>
            </div>
          </>
        ) : (
          /* ── Add Friends tab ─────────────────────────────────────── */
          <>
            {profile && (
              <FriendCodeCard friendCode={profile.friend_code} />
            )}

            <div className="p-5" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
              <h2 className="mb-3" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>Add a friend</h2>
              <AddFriendForm onRequestSent={loadAll} />
            </div>
          </>
        )}
      </div>
    </KitchenSurface>
  );
}
