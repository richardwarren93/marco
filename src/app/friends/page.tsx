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
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <div className="space-y-4">
          <div className="h-8 bg-gray-100 rounded-full animate-pulse w-32" />
          <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const pendingCount = incoming.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <FriendsIcon className="w-7 h-7 text-orange-600" /> Friends
      </h1>

      {/* Your Code */}
      {profile && (
        <FriendCodeCard
          friendCode={profile.friend_code}
          displayName={profile.display_name}
        />
      )}

      {/* Add Friend */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Add a Friend
        </h2>
        <AddFriendForm onRequestSent={loadAll} />
      </div>

      {/* Pending Requests */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            Pending Requests
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold">
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
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          My Friends
          {friends.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({friends.length})
            </span>
          )}
        </h2>
        {friends.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <div className="text-gray-300 flex justify-center mb-3"><FriendsIcon className="w-12 h-12" /></div>
            <p className="text-gray-500">No friends yet</p>
            <p className="text-gray-400 text-sm mt-1">
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
