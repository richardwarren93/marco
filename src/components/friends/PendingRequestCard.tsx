"use client";

import { useState } from "react";
import type { UserProfile } from "@/types";

interface PendingRequestCardProps {
  friendshipId: string;
  profile: UserProfile | null;
  direction: "incoming" | "outgoing";
  onResponded: () => void;
}

export default function PendingRequestCard({
  friendshipId,
  profile,
  direction,
  onResponded,
}: PendingRequestCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleRespond(action: "accept" | "decline") {
    setLoading(true);
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: friendshipId, action }),
      });
      if (res.ok) onResponded();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: friendshipId }),
      });
      if (res.ok) onResponded();
    } catch {
      // ignore
    } finally {
      setLoading(false);
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
      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500">
          {direction === "incoming"
            ? "wants to be your friend"
            : "request pending"}
        </p>
      </div>
      {direction === "incoming" ? (
        <div className="flex gap-2">
          <button
            onClick={() => handleRespond("accept")}
            disabled={loading}
            className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={() => handleRespond("decline")}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      ) : (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
