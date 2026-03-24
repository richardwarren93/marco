"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserProfile, Friendship } from "@/types";
import FriendCodeCard from "@/components/friends/FriendCodeCard";
import AddFriendForm from "@/components/friends/AddFriendForm";
import FriendCard from "@/components/friends/FriendCard";
import PendingRequestCard from "@/components/friends/PendingRequestCard";
import { FriendsIcon } from "@/components/icons/HandDrawnIcons";

export default function FriendsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incoming, setIncoming] = useState<Friendship[]>([]);
  const [outgoing, setOutgoing] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8" style={{ background: "#faf9f7", minHeight: "100vh" }}>
        <div className="space-y-4">
          <div className="h-8 skeleton-warm rounded-2xl w-32" />
          <div className="h-40 skeleton-warm rounded-3xl" />
          <div className="h-20 skeleton-warm rounded-3xl" />
          <div className="h-20 skeleton-warm rounded-3xl" />
        </div>
      </div>
    );
  }

  const pendingCount = incoming.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5 animate-fade-slide-up" style={{ background: "#faf9f7", minHeight: "100vh" }}>
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>Friends</h1>
        <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>Cook & share with friends</p>
      </div>

      {/* Your Code */}
      {profile && (
        <FriendCodeCard
          friendCode={profile.friend_code}
          displayName={profile.display_name}
        />
      )}

      {/* Add Friend */}
      <div className="rounded-3xl p-5" style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
        <h2 className="text-base font-bold mb-3" style={{ color: "#1a1410" }}>
          Add a Friend
        </h2>
        <AddFriendForm onRequestSent={loadAll} />
      </div>

      {/* Pending Requests */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "#1a1410" }}>
            Pending Requests
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold" style={{ background: "#f97316" }}>
                {pendingCount}
              </span>
            )}
          </h2>
          <div className="space-y-2">
            {incoming.map((req) => (
              <PendingRequestCard
                key={req.id}
                friendshipId={req.id}
                profile={req.profile || null}
                direction="incoming"
                onResponded={loadAll}
              />
            ))}
            {outgoing.map((req) => (
              <PendingRequestCard
                key={req.id}
                friendshipId={req.id}
                profile={req.profile || null}
                direction="outgoing"
                onResponded={loadAll}
              />
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-1.5" style={{ color: "#1a1410" }}>
          My Friends
          {friends.length > 0 && (
            <span className="text-sm font-normal" style={{ color: "#a09890" }}>
              ({friends.length})
            </span>
          )}
        </h2>
        {friends.length === 0 ? (
          <div className="text-center py-12 rounded-3xl" style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            <div className="flex justify-center mb-3" style={{ color: "#d4c9be" }}><FriendsIcon className="w-12 h-12" /></div>
            <p style={{ color: "#a09890" }}>No friends yet</p>
            <p className="text-sm mt-1" style={{ color: "#c4b8af" }}>
              Share your code or enter a friend&apos;s code above!
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {friends.map((f) => (
              <FriendCard
                key={f.id}
                friendshipId={f.id}
                profile={f.profile || null}
                onRemoved={loadAll}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
