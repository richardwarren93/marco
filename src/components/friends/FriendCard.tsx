"use client";

import { useState } from "react";
import Image from "next/image";
import type { UserProfile } from "@/types";

interface FriendCardProps {
  friendshipId: string;
  profile: UserProfile | null;
  onRemoved: () => void;
}

export default function FriendCard({
  friendshipId,
  profile,
  onRemoved,
}: FriendCardProps) {
  const [removing, setRemoving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: friendshipId }),
      });
      if (res.ok) onRemoved();
    } catch {
      // ignore
    } finally {
      setRemoving(false);
      setShowConfirm(false);
    }
  }

  const name = profile?.display_name || "Unknown";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500">{profile?.friend_code}</p>
      </div>
      {showConfirm ? (
        <div className="flex gap-1">
          <button
            onClick={handleRemove}
            disabled={removing}
            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {removing ? "..." : "Yes"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  );
}
